import { Injectable, Logger } from '@nestjs/common';
import conf from './config';
import axios, { AxiosRequestConfig } from 'axios';
import * as pdf from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';

type Dictionary = {
  [key: string]: string;
};

const functions = [
  {
    name: 'industry',
    description: '这是关于行业研报的问题模版',
    parameters: {
      type: 'object',
      properties: {
        coreTechnology: {
          type: 'string',
          description: '这个行业的核心技术是什么',
        },
        marketSpace: {
          type: 'string',
          description: '这个行业的市场空间有多大',
        },
        competitiveLandscape: {
          type: 'string',
          description: '这个行业里的竞争格局是什么样子的',
        },
        industryCompany: {
          type: 'string',
          description: '这个行业里都有哪些竞争公司',
        },
        companyFeature: {
          type: 'string',
          description: '在这个行业里， 每个竞争公司都有什么特点',
        },
        marketShare: {
          type: 'string',
          description: ' 在这个行业里， 每个竞争公司的市占率是多少',
        },
        companyCoreAdvantages: {
          type: 'string',
          description: '在这个行业里，每个竞争公司的核心优势是什么',
        },
        companyTechnicalBarriers: {
          type: 'string',
          description: '这个行业的技术壁垒是什么',
        },
        incomeProfitOrLoss: {
          type: 'string',
          description: '这个行业今年的收入、盈利或者亏损分别是多少',
        },
        situation: {
          type: 'string',
          description: '这个行业今年的情况和往年相比怎么样',
        },
        oneSentenceDescription: {
          type: 'string',
          description: '一句话总结',
        },
        articleSkinning: {
          type: 'string',
          description: '总结文章内容',
        },
      },
    },
  },
  {
    name: 'company',
    description: '这是公司分析的问题模板',
    parameters: {
      type: 'object',
      properties: {
        basicIntroductionAndBusinessHistory: {
          type: 'string',
          description: '这个公司的基本简介和经营历史是怎样的',
        },
        equityStructureAndTeamComposition: {
          type: 'string',
          description: '这个公司的股权结构和团队组成是怎样的',
        },
        mainBusiness: {
          type: 'string',
          description: '这个公司的主营业务是什么',
        },
        profitModel: {
          type: 'string',
          description: '这个公司的盈利模式是什么',
        },
        customerComposition: {
          type: 'string',
          description: '这个公司的客户构成是怎样的',
        },
        financialIndicatorsAndOperatingConditions: {
          type: 'string',
          description: '这个公司的财务指标和经营情况是怎样的',
        },
        oneSentenceDescription: {
          type: 'string',
          description: '一句话总结',
        },
        articleSkinning: {
          type: 'string',
          description: '文章略读',
        },
      },
    },
  },
  {
    name: 'ordinaryArticles',
    description: '这是普通文章的分析模板',
    parameters: {
      type: 'object',
      properties: {
        oneSentenceDescription: {
          type: 'string',
          description: '一句话总结',
        },
        articleSkinning: {
          type: 'string',
          description: '文章略读',
        },
      },
    },
  },
];

@Injectable()
class ReportService {
  async getTxt(filePath: string): Promise<{ title: string; content: string }> {
    let contents = '';
    const title = path.basename(filePath);
    try {
      const dataBuffer: Buffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      contents = pdfData.text;
    } catch (err) {
      Logger.error('AppService getTxt error', err);
    }
    return { title: title, content: contents };
  }
  async queryGpt(
    content: any,
    systemPrompt: any,
    source: string,
  ): Promise<any> {
    // const qu =
    //   '    这个行业的核心技术是什么？（coreTechnology）前文答案：' +
    //   '    \n这个行业的市场空间有多大？（marketSpace）' +
    //   '    \n这个行业里的竞争格局是什么样子的？（competitiveLandscape）' +
    //   '    \n这个行业里都有哪些竞争公司？（industryCompany）' +
    //   '    \n在这个行业里， 每个竞争公司都有什么特点？(companyFeature)' +
    //   '    \n在这个行业里， 每个竞争公司的市占率是多少？(marketShare)' +
    //   '    \n在这个行业里，每个竞争公司的核心优势是什么？（companyCoreAdvantages）' +
    //   '    \n这个行业的技术壁垒是什么？(companyTechnicalBarriers)' +
    //   '    \n这个行业今年的收入、盈利或者亏损分别是多少？(incomeProfitOrLoss)' +
    //   '    \n这个行业今年的情况和往年相比怎么样？(situation)' +
    //   '    \n一句话总结 (oneSentenceDescription)' +
    //   '    \n总结文章内容（articleSkinning）' +
    //   '    \n这个公司的基本简介和经营历史是怎样的？（basicIntroductionAndBusinessHistory）' +
    //   '    \n这个公司的股权结构和团队组成是怎样的？（equityStructureAndTeamComposition）' +
    //   '    \n这个公司的主营业务是什么？（mainBusiness）' +
    //   '    \n这个公司的盈利模式是什么？（profitModel）' +
    //   '    \n这个公司的客户构成是怎样的？（customerComposition）' +
    //   '    \n这个公司的财务指标和经营情况是怎样的？（financialIndicatorsAndOperatingConditions）';

    
    const data = {
      model: 'gpt-3.5-turbo-16k-0613',
      
      messages: [
        {
          role: 'system',
          content:
            '以下是本文章的前半部分关于以下问题的总结，请结合回答下面问题' +
            systemPrompt,
        },
        {
          role: 'user',
          content:
            '回答以下问题,注意这篇文档是分开发给你的，所以有些问题的答案可能不在本文档中，而是在system中的提示，请一定要结合提示回答',
        },
        { role: 'assistant', content: '文本如下：' + content },
      ],
      functions: functions,
      function_call: { name: source == 'none' ? 'ordinaryArticles' : source },
    };
    Logger.log('system prompt', systemPrompt);
    Logger.log('content', content);
    const config: AxiosRequestConfig = {
      method: 'post',
      url: conf.openAiHost + '/v1/chat/completions',
      headers: {
        'Content-Type': ' application/json',
        Authorization: `Bearer ${conf.apiKeyList[0]}`,
      },
      data: data,
    };
    const res = await axios(config);
    const choice = res.data.choices[0].message;
    Logger.log('AppService queryGpt res', choice);
    if (choice.function_call) {
      let name = choice.function_call.name;
      if (choice.function_call.name === 'report') {
        name = choice.function_call.arguments.source;
      }
      return {
        name: name,
        arguments: JSON.parse(choice.function_call.arguments),
      };
    }
    return {};
  }

  async summarizeByGPT(content: any, source: string): Promise<any> {
    // const qu =
    //   '    这个行业的核心技术是什么？（coreTechnology）前文答案：' +
    //   '    \n这个行业的市场空间有多大？（marketSpace）' +
    //   '    \n这个行业里的竞争格局是什么样子的？（competitiveLandscape）' +
    //   '    \n这个行业里都有哪些竞争公司？（industryCompany）' +
    //   '    \n在这个行业里， 每个竞争公司都有什么特点？(companyFeature)' +
    //   '    \n在这个行业里， 每个竞争公司的市占率是多少？(marketShare)' +
    //   '    \n在这个行业里，每个竞争公司的核心优势是什么？（companyCoreAdvantages）' +
    //   '    \n这个行业的技术壁垒是什么？(companyTechnicalBarriers)' +
    //   '    \n这个行业今年的收入、盈利或者亏损分别是多少？(incomeProfitOrLoss)' +
    //   '    \n这个行业今年的情况和往年相比怎么样？(situation)' +
    //   '    \n一句话总结 (oneSentenceDescription)' +
    //   '    \n总结文章内容（articleSkinning）' +
    //   '    \n这个公司的基本简介和经营历史是怎样的？（basicIntroductionAndBusinessHistory）' +
    //   '    \n这个公司的股权结构和团队组成是怎样的？（equityStructureAndTeamComposition）' +
    //   '    \n这个公司的主营业务是什么？（mainBusiness）' +
    //   '    \n这个公司的盈利模式是什么？（profitModel）' +
    //   '    \n这个公司的客户构成是怎样的？（customerComposition）' +
    //   '    \n这个公司的财务指标和经营情况是怎样的？（financialIndicatorsAndOperatingConditions）';
// 每个问题分段总结后再总结一下
    const data = {
      model: 'gpt-3.5-turbo-16k-0613',
      messages: [
        {
          role: 'user',
          content:
            '这些问题是每一段分段总结后的结果，请给每个问题再总结一下回答',
        },
        { role: 'assistant', content: '文本如下：' + content },
      ],
      functions: functions,
      function_call: { name: source == 'none' ? 'ordinaryArticles' : source },
    };
    Logger.log('content', content);
    const config: AxiosRequestConfig = {
      method: 'post',
      url: conf.openAiHost + '/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conf.apiKeyList[0]}`,
      },
      data: data,
    };
    const res = await axios(config);
    const choice = res.data.choices[0].message;
    Logger.log('AppService queryGpt res', choice);
    if (choice.function_call) {
      let name = choice.function_call.name;
      if (choice.function_call.name === 'report') {
        name = choice.function_call.arguments.source;
      }
      return {
        name: name,
        arguments: JSON.parse(choice.function_call.arguments),
      };
    }
    return {};
  }

  mergeDic(content: string, dic?: Dictionary): Dictionary {
    const obj = JSON.parse(content);
    let coreTechnologyStr: string,
      marketSpaceStr: string,
      competitiveLandscapeStr: string,
      industryCompanyStr: string,
      companyFeatureStr: string,
      marketShareStr: string,
      companyCoreAdvantagesStr: string,
      companyTechnicalBarriersStr: string,
      incomeProfitOrLossStr: string,
      situationStr: string;
    if (dic) {
      // 如果dic有值，循环从dic中取值
      coreTechnologyStr = dic['coreTechnology'];
      marketSpaceStr = dic['MarketSpace'];
      competitiveLandscapeStr = dic['CompetitiveLandscape'];
      industryCompanyStr = dic['industryCompany'];
      companyFeatureStr = dic['CompanyFeature'];
      marketShareStr = dic['MarketShare'];
      companyCoreAdvantagesStr = dic['companyCoreAdvantages'];
      companyTechnicalBarriersStr = dic['companyTechnicalBarriers'];
      incomeProfitOrLossStr = dic['IncomeProfitOrLoss'];
      situationStr = dic['situation'];
    } else {
      coreTechnologyStr =
        marketSpaceStr =
        competitiveLandscapeStr =
        industryCompanyStr =
        companyFeatureStr =
        marketShareStr =
        companyCoreAdvantagesStr =
        companyTechnicalBarriersStr =
        incomeProfitOrLossStr =
        situationStr =
          '';
    }
    coreTechnologyStr += 'text:' + String(obj['coreTechnology']) + ';\n';
    marketSpaceStr += 'text:' + String(obj['MarketSpace']) + ';\n';
    competitiveLandscapeStr +=
      'text:' + String(obj['CompetitiveLandscape']) + ';\n';
    industryCompanyStr += 'text:' + String(obj['industryCompany']) + ';\n';
    if ('CompanyFeature' in obj) {
      companyFeatureStr += 'text:' + String(obj['CompanyFeature']) + ';\n';
    }
    if ('MarketShare' in obj) {
      marketShareStr += 'text:' + String(obj['MarketShare']) + ';\n';
    }
    if ('companyCoreAdvantages' in obj) {
      companyCoreAdvantagesStr +=
        'text:' + String(obj['companyCoreAdvantages']) + ';\n';
    }
    if ('companyTechnicalBarriers' in obj) {
      companyTechnicalBarriersStr +=
        'text:' + String(obj['companyTechnicalBarriers']) + ';\n';
    }
    if ('IncomeProfitOrLoss' in obj) {
      incomeProfitOrLossStr +=
        'text:' + String(obj['IncomeProfitOrLoss']) + ';\n';
    }
    if ('situation' in obj) {
      situationStr += 'text:' + String(obj['situation']) + ';\n';
    }
    return {
      coreTechnology: coreTechnologyStr,
      marketSpace: marketSpaceStr,
      competitiveLandscape: competitiveLandscapeStr,
      industryCompany: industryCompanyStr,
      companyFeature: companyFeatureStr,
      marketShare: marketShareStr,
      companyCoreAdvantages: companyCoreAdvantagesStr,
      companyTechnicalBarriers: companyTechnicalBarriersStr,
      incomeProfitOrLoss: incomeProfitOrLossStr,
      situation: situationStr,
    };
  }
// 这个方法没用到
  async getSummary(dic: Dictionary): Promise<Dictionary> {
    const systemPrompt =
      'GOALS:\n' +
      '    这个行业的核心技术是什么？（coreTechnology）\n' +
      '    这个行业的市场空间有多大？（MarketSpace）\n' +
      '    这个行业里的竞争格局是什么样子的？（CompetitiveLandscape）\n' +
      '    这个行业里都有哪些竞争公司？（industry Company）\n' +
      '    在这个行业里， 每个竞争公司都有什么特点？(CompanyFeature)\n' +
      '    在这个行业里， 每个竞争公司的市占率是多少？(MarketShare)\n' +
      '    在这个行业里，每个竞争公司的核心优势是什么？（companyCoreAdvantages）\n' +
      '    这个行业的技术壁垒是什么？(companyTechnicalBarriers)\n' +
      '    这个行业今年的收入、盈利或者亏损分别是多少？(IncomeProfitOrLoss)\n' +
      '    这个行业今年的情况和往年相比怎么样？(situation)\n' +
      '    在给定的文本里找到以上问题的答案， 请注意：请谨慎评估问题与文本信息的相关性，只回答跟文本相关的内容，如果在提供的文本中没有答案，请在回答"无"，另外也不要回答无关答案';

    const data = {
      model: 'gpt-3.5-turbo-16k-0613',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: '行业专家' },
        { role: 'user', content: '文本如下：' + dic },
      ],
      functions: [
        {
          name: 'parse',
          description: 'trans the result',
          parameters: {
            type: 'object',
            properties: {
              coreTechnology: {
                type: 'string',
                description: 'coreTechnology',
              },
              MarketSpace: {
                type: 'string',
                description: 'MarketSpace',
              },
              CompetitiveLandscape: {
                type: 'string',
                description: 'CompetitiveLandscape',
              },
              industryCompany: {
                type: 'string',
                description: 'industryCompany',
              },
              CompanyFeature: {
                type: 'string',
                description: 'CompanyFeature',
              },
              MarketShare: {
                type: 'string',
                description: 'MarketShare',
              },
              companyCoreAdvantages: {
                type: 'string',
                description: 'companyCoreAdvantages',
              },
              companyTechnicalBarriers: {
                type: 'string',
                description: 'companyTechnicalBarriers',
              },
              incomeProfitOrLoss: {
                type: 'string',
                description: 'IncomeProfitOrLoss',
              },
              situation: {
                type: 'string',
                description: 'situation',
              },
            },
          },
        },
      ],
      function_call: {
        name: 'parse',
      },
    };
    const config: AxiosRequestConfig = {
      method: 'post',
      url: conf.openAiHost + '/v1/chat/completions ',
      headers: {
        'Content-Type': ' application/json',
        Authorization: `Bearer ${conf.apiKeyList[0]}`,
      },
      data: data,
    };
    const res = await axios(config);
    const choice = res.data.choices[0].message;
    if (choice.function_call) {
      return choice.function_call.arguments;
    }
    return {};
  }

  isJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  toJson(item: any): string {
    return JSON.stringify(item);
  }

  checkJson(item: any): string {
    const isStr = typeof item === 'string';
    if (isStr) {
      const isJsonItem = this.isJson(item);
      if (!isJsonItem) {
        return this.toJson(item);
      } else {
        return item;
      }
    } else {
      return this.toJson(item);
    }
  }

  splitParagraph(text: string, maxLength = 10000): string[] {
    if (typeof text === 'undefined' || text === null) {
      return [];
    }

    text = text.replace('\n', '');
    text = text.replace(/\s+/g, ' ');

    // Split the text into sentences
    const sentences = text.split(/(；|。|！|\!|\.|？|\?)/); // Keep the separators

    const newSents = [];
    for (let i = 0; i < Math.floor(sentences.length / 2); i++) {
      const sent = sentences[2 * i] + sentences[2 * i + 1];
      newSents.push(sent);
    }
    if (sentences.length % 2 === 1) {
      newSents.push(sentences[sentences.length - 1]);
    }

    // Split the sentences into paragraphs
    const paragraphs = [];
    let currentLength = 0;
    let currentParagraph = '';
    for (const sentence of newSents) {
      const sentenceLength = sentence.length;
      if (currentLength + sentenceLength <= maxLength) {
        currentParagraph += sentence;
        currentLength += sentenceLength;
      } else {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = sentence;
        currentLength = sentenceLength;
      }
    }
    paragraphs.push(currentParagraph.trim());

    return paragraphs;
  }

  async trans(content: string): Promise<any> {
    const paragraphs = this.splitParagraph(content);

    let res = { name: undefined, arguments: undefined };
    const type = await this.queryGptForReportType(paragraphs[0]);
    Logger.log(type, 'type');
    if (type === undefined) {
      res.name = 'none';
    } else {
      res.name = type;
    }
    let args: any = {};
    for (const paragraph of paragraphs) {
      res = await this.queryGpt(paragraph, res.arguments, res.name);
      args = Object.assign(
        args,
        {
          oneSentenceDescription:
            args.oneSentenceDescription + res.arguments.oneSentenceDescription,
          coreTechnology: args.coreTechnology + res.arguments.coreTechnology,
          marketSpace: args.marketSpace + res.arguments.marketSpace,
          competitiveLandscape:
            args.competitiveLandscape + res.arguments.competitiveLandscape,
          industryCompany: args.industryCompany + res.arguments.industryCompany,
          companyFeature: args.companyFeature + res.arguments.companyFeature,
          marketShare: args.marketShare + res.arguments.marketShare,
          companyCoreAdvantages:
            args.companyCoreAdvantages + res.arguments.companyCoreAdvantages,
          companyTechnicalBarriers:
            args.companyTechnicalBarriers +
            res.arguments.companyTechnicalBarriers,
          incomeProfitOrLoss:
            args.incomeProfitOrLoss + res.arguments.incomeProfitOrLoss,
          situation: args.situation + res.arguments.situation,
          articleSkinning: args.articleSkinning + res.arguments.articleSkinning,
          basicIntroductionAndBusinessHistory:
            args.basicIntroductionAndBusinessHistory +
            res.arguments.basicIntroductionAndBusinessHistory,
          companyBusinessModel:
            args.companyBusinessModel + res.arguments.companyBusinessModel,
          equityStructureAndTeamComposition:
            args.equityStructureAndTeamComposition +
            res.arguments.equityStructureAndTeamComposition,
          mainBusiness: args.mainBusiness + res.arguments.mainBusiness,
          profitModel: args.profitModel + res.arguments.profitModel,
          customerComposition:
            args.customerComposition + res.arguments.customerComposition,
          financialIndicatorsAndOperatingConditions:
            args.financialIndicatorsAndOperatingConditions +
            res.arguments.financialIndicatorsAndOperatingConditions,
        },
        res.arguments,
      );
    }
    // 使用GPT把所有的拼接内容再总结一遍
    return this.summarizeByGPT(args, res.name);
  }
// 这是查看是公司还是行业还是普通文章
  private async queryGptForReportType(content: string): Promise<any> {
    const data = {
      model: 'gpt-3.5-turbo-16k-0613',
      messages: [
        {
          role: 'system',
          content: content,
        },
        {
          role: 'user',
          content:
            '这是一篇关于某个公司（company）的调研报告还是关于某一个行业（industry）的调研报告？如果都不是那就是一篇普通的文章（ordinaryArticles）',
        },
        {
          role: 'assistant',
          content: '你是一名资深金融研究人员',
        },
      ],
      functions: [
        {
          name: 'confirmSource',
          description: '这是关于行业研报的问题模版',
          parameters: {
            type: 'object',
            properties: {
              source: {
                type: 'string',
                enum: ['company', 'industry', 'ordinaryArticles', 'none'],
                description:
                  '这是一篇关于某个公司（company）的调研报告还是关于某一个行业（industry）的调研报告？如果都不是那就是一篇普通的文章（ordinaryArticles）',
              },
            },
          },
        },
      ],
      function_call: { name: 'confirmSource' },
    };
    const config: AxiosRequestConfig = {
      method: 'post',
      url: conf.openAiHost + '/v1/chat/completions',
      headers: {
        'Content-Type': ' application/json',
        Authorization: `Bearer ${conf.apiKeyList[0]}`,
      },
      data: data,
    };
    Logger.log('AppService queryGpt data', data);
    const res = await axios(config);
    const choice = res.data.choices[0].message;
    Logger.log('AppService queryGpt res', choice);
    if (choice.function_call) {
      return JSON.parse(choice.function_call.arguments).source;
    }
    return undefined;
  }
}
export { ReportService, Dictionary };
