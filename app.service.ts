import { Injectable } from '@nestjs/common';
import { Configuration, OpenAIApi } from 'openai';
import * as lark from '@larksuiteoapi/node-sdk';
import * as fs from 'fs';
import axios, { AxiosRequestConfig } from 'axios';
import { Logger } from '@nestjs/common';
import { Client } from '@larksuiteoapi/node-sdk';
import conf from './config';
import * as path from 'path';
import { ReportService } from './reportService';

@Injectable()
export class AppService {
  appId = conf.appId;
  appSecret = conf.AppSecret;
  apiKeyList: string[] = conf.apiKeyList;
  client: Client = new lark.Client({
    appId: this.appId,
    appSecret: this.appSecret,
    disableTokenCache: false,
  });
  jsonData = JSON.parse(fs.readFileSync(`./history.json`, 'utf8'));
  timeData = JSON.parse(fs.readFileSync(`./time.json`, 'utf8'));
  reportService = new ReportService();

  async getFeishuMsgReceive(params) {
    const messageId = params.event.message.message_id;
    if (params.event.message.chat_type === 'p2p') {
      const userInput = JSON.parse(params.event.message.content);
      const user = params.event.sender.sender_id.open_id;
      if (params.event.message.message_type == 'file') {
        const filePath = './file/' + user + '/' + userInput.file_name;
        this.ensureDir('./file/' + user);
        await this.downloadFileInMsg(messageId, userInput.file_key, filePath);
        await this.analysisAndSummarizeFile(filePath, user);
      } else {
        let question = userInput.text.replace('@_user_1', '');
        // console.log(user)
        if (question === 'n') {
          delete this.jsonData[user];
          delete this.timeData[user];
          fs.writeFileSync(
            './history.json',
            JSON.stringify(this.jsonData, null, 4),
          );
          await this.reply(messageId, 'new chat');
        } else {
          if (this.jsonData.hasOwnProperty(user)) {
            const lastSessionTime = this.timeData[user];
            const currentDate: any = new Date().getTime();
            const DValue = currentDate - lastSessionTime;
            if (DValue / 1000 / 60 > 10) {
              this.timeData[user] = new Date().getTime();
              this.jsonData[user] = question;
            } else {
              this.timeData[user] = new Date().getTime();
              const questionTmp = question;
              const str =
                questionTmp + '。这是之前的记录：' + this.jsonData[user];
              if (str.length > 2048) {
                const questionLength = (questionTmp + '。这是之前的记录：')
                  .length;
                const subString = this.jsonData[user].substring(
                  0,
                  2048 - questionLength,
                );
                question = questionTmp + '。这是之前的记录：' + subString;
                this.jsonData[user] = subString + questionTmp;
              } else {
                question =
                  questionTmp + '。这是之前的记录：' + this.jsonData[user];
                this.jsonData[user] = this.jsonData[user] + questionTmp;
              }
            }
          } else {
            this.timeData[user] = new Date().getTime();
            this.jsonData[user] = question;
          }
          Logger.log('question', question);
          fs.writeFileSync(
            './history.json',
            JSON.stringify(this.jsonData, null, 4),
          );
          fs.writeFileSync(
            './time.json',
            JSON.stringify(this.timeData, null, 4),
          );
          const prompt = this.getPrompt(question.trim());
          const openaiResponse = await this.getOpenAIReply(prompt, 0, user);
          if (openaiResponse) {
            await this.reply(messageId, openaiResponse);
          }
        }
      }
    }
  }

  async analysisAndSummarizeFile(filePath: string, openId: string) {
    const contents = await this.reportService.getTxt(filePath);
    let timeUse = Math.floor(contents.content.length / 300);
    if (timeUse < 90) {
      timeUse = 90;
    } else {
      timeUse += 60;
    }
    this.client.im.message.create({
      data: {
        receive_id: openId,
        msg_type: 'interactive',
        content:
          '{\n' +
          '  "config": {\n' +
          '    "wide_screen_mode": true\n' +
          '  },\n' +
          '  "elements": [\n' +
          '    {\n' +
          '      "tag": "div",\n' +
          '      "text": {\n' +
          `        "content": "共计${contents.content.length}字，大概需要${timeUse}秒完成",\n` +
          '        "tag": "lark_md"\n' +
          '      }\n' +
          '    }\n' +
          '  ],\n' +
          '  "header": {\n' +
          '    "template": "blue",\n' +
          '    "title": {\n' +
          '      "content": "文件分析助手",\n' +
          '      "tag": "plain_text"\n' +
          '    }\n' +
          '  }\n' +
          '}',
      },
      params: {
        receive_id_type: 'open_id',
      },
    });
    const res = await this.reportService.trans(contents.content);
    Logger.log('res', res);
    const data = res.arguments;
    let msgContent =
      contents.title +
      '内容分析:\\n' +
      '**【一句话描述】 **' +
      (data.oneSentenceDescription ? data.oneSentenceDescription : '暂无') +
      '\\n**【文章略读】 **' +
      (data.articleSkinning ? data.articleSkinning : '暂无');
    if (res.name == 'industry' || res.name == 'company') {
      msgContent += '\\n**【相关问题】**';
    }
    if (res.name == 'industry' && data.coreTechnology) {
      msgContent +=
        '\\n**这个行业的核心技术是什么? **\\n' + data.coreTechnology;
    }
    if (res.name == 'industry' && data.marketSpace) {
      msgContent += '\\n**这个行业的市场空间有多大? **\\n' + data.marketSpace;
    }
    if (res.name == 'industry' && data.competitiveLandscape) {
      msgContent +=
        '\\n**这个行业里的竞争格局是什么样子的? **\\n' +
        data.competitiveLandscape;
    }
    if (res.name == 'industry' && data.industryCompany) {
      msgContent +=
        '\\n**这个行业里都有哪些竞争公司? **\\n' + data.industryCompany;
    }
    if (res.name == 'industry' && data.companyFeature) {
      msgContent +=
        '\\n**在这个行业里， 每个竞争公司都有什么特点? **\\n' +
        data.companyFeature;
    }
    if (res.name == 'industry' && data.marketShare) {
      msgContent +=
        '\\n**在这个行业里， 每个竞争公司的市占率是多少? **\\n' +
        data.marketShare;
    }
    if (res.name == 'industry' && data.companyCoreAdvantages) {
      msgContent +=
        '\\n**在这个行业里，每个竞争公司的核心优势是什么?**\\n' +
        data.companyCoreAdvantages;
    }
    if (res.name == 'industry' && data.companyTechnicalBarriers) {
      msgContent +=
        '\\n**在这个行业里，每个竞争公司的技术壁垒是什么?**\\n' +
        data.companyTechnicalBarriers;
    }
    if (res.name == 'industry' && data.incomeProfitOrLoss) {
      msgContent +=
        '\\n**这个行业今年的收入、盈利或者亏损分别是多少?**\\n' +
        data.incomeProfitOrLoss;
    }
    if (res.name == 'industry' && data.situation) {
      msgContent +=
        '\\n**这个行业今年的情况和往年相比怎么样?**\\n' + data.situation;
    }
    if (res.name == 'company' && data.basicIntroductionAndBusinessHistory) {
      msgContent +=
        '\\n**这个公司的基本简介和经营历史是怎样的?**\\n' +
        data.basicIntroductionAndBusinessHistory;
    }
    if (res.name == 'company' && data.equityStructureAndTeamComposition) {
      msgContent +=
        '\\n**这个公司的股权结构和团队组成是怎样的?**\\n' +
        data.equityStructureAndTeamComposition;
    }
    if (res.name == 'company' && data.mainBusiness) {
      msgContent += '\\n**这个公司的主营业务是什么?**\\n' + data.mainBusiness;
    }
    if (res.name == 'company' && data.profitModel) {
      msgContent += '\\n**这个公司的盈利模式是什么?**\\n' + data.profitModel;
    }
    if (res.name == 'company' && data.customerComposition) {
      msgContent +=
        '\\n**这个公司的客户构成是怎样的?**\\n' + data.customerComposition;
    }
    if (
      res.name == 'company' &&
      data.financialIndicatorsAndOperatingConditions
    ) {
      msgContent +=
        '\\n**这个公司的财务指标和经营情况是怎样的?**\\n' +
        data.financialIndicatorsAndOperatingConditions;
    }
    Logger.log('msgContent', msgContent);
    this.client.im.message
      .create({
        data: {
          receive_id: openId,
          msg_type: 'interactive',
          content:
            '{\n' +
            '  "config": {\n' +
            '    "wide_screen_mode": true\n' +
            '  },\n' +
            '  "elements": [\n' +
            '    {\n' +
            '      "tag": "div",\n' +
            '      "text": {\n' +
            `        "content": "${msgContent}",\n` +
            '        "tag": "lark_md"\n' +
            '      }\n' +
            '    },\n' +
            '    {\n' +
            '      "actions": [\n' +
            '        {\n' +
            '          "tag": "button",\n' +
            '          "text": {\n' +
            '            "content": "重试",\n' +
            '            "tag": "plain_text"\n' +
            '          },\n' +
            '          "type": "primary",\n' +
            '          "value": {\n' +
            '            "filePath": "' +
            filePath +
            '",\n' +
            '            "type": "reportRetry"\n' +
            '          }\n' +
            '        }\n' +
            '      ],\n' +
            '      "tag": "action"\n' +
            '    }\n' +
            '  ],\n' +
            '  "header": {\n' +
            '    "template": "blue",\n' +
            '    "title": {\n' +
            '      "content": "文件分析助手",\n' +
            '      "tag": "plain_text"\n' +
            '    }\n' +
            '  }\n' +
            '}',
        },
        params: {
          receive_id_type: 'open_id',
        },
      })
      .then((res) => {
        Logger.log('res', res);
      })
      .catch((err) => {
        Logger.log('err', err);
      });
  }
  async downloadFileInMsg(
    messageId: string,
    fileKey: string,
    filePath: string,
  ) {
    const response = await this.client.im.messageResource.get({
      params: {
        type: 'file',
      },
      path: {
        message_id: messageId,
        file_key: fileKey,
      },
    });
    await response.writeFile(filePath);
  }

  async getOpenAIReply(content, index, user) {
    try {
      const apiKey = this.apiKeyList[index];
      Logger.log('apiKey', index, apiKey);
      const configuration = new Configuration({
        apiKey,
      });
      // console.log('content', prompt)
      const openai = new OpenAIApi(configuration);
      const data = {
        model: 'gpt-3.5-turbo-16k-0613',
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
      };
      const config: AxiosRequestConfig = {
        method: 'post',
        url: conf.openAiHost + '/v1/chat/completions',
        headers: {
          'Content-Type': ' application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        data: data,
      };

      // const completion = await openai.createCompletion({
      //   model: "gpt-3.5-turbo-16k-0613",
      //   // messages: [{ role: "user", content: content }],
      //   prompt: content,
      //   temperature: 0.8,
      //   frequency_penalty: 0.0,
      //   presence_penalty: 0.0,
      //   top_p: 1,
      //   stop: ["{}"],
      //   max_tokens: 1024
      // });
      const res = await axios(config);
      // console.log(res);
      Logger.log('answer', res.data.choices[0].message.content);
      return res.data.choices[0].message.content.replace('\n\n', '');
    } catch (error) {
      Logger.error('error', error);
      Logger.error('error', index, error.response.status);
      if (index < this.apiKeyList.length - 1) {
        Logger.log('retry');
        return await this.getOpenAIReply(content, ++index, user);
      } else {
        if (error.response) {
          // console.log('status', index, error.response.status);
          Logger.log(
            'getOpenAIReply error!',
            user,
            error.response.status,
            error.response.data,
          );
          if (index === this.apiKeyList.length - 1) {
            if (error.response.status == 400) {
              return '抱歉，问题字数过多';
            } else if (error.response.status == 429) {
              Logger.error('rrr');
              return '请求频繁，请稍后再试';
            }
          }
          // console.log('data', error.response.data);
        } else {
          Logger.error(error.message);
          // logger.log('getOpenAIReply error!', user, error.message)
        }
      }
    }
  }

  // 回复消息
  async reply(messageId, content) {
    Logger.log('messageId', messageId);
    try {
      return await this.client.im.message.reply({
        path: {
          message_id: messageId,
        },
        data: {
          content: JSON.stringify({
            text: content,
          }),
          msg_type: 'text',
        },
      });
    } catch (e) {
      Logger.error(e);
      // logger.log("send message to feishu error", e, messageId, content);
    }
  }

  // 根据中英文设置不同的 prompt
  getPrompt(content) {
    if (content.length === 0) {
      return '';
    }
    if (
      (content[0] >= 'a' && content[0] <= 'z') ||
      (content[0] >= 'A' && content[0] <= 'Z')
    ) {
      return (
        'You are ChatGPT, a LLM model trained by OpenAI. \nplease answer my following question\nQ: ' +
        content +
        '\nA: '
      );
    }

    return (
      '你是 ChatGPT, 一个由 OpenAI 训练的大型语言模型, 你旨在回答并解决人们的任何问题，并且可以使用多种语言与人交流。\n请回答我下面的问题\nQ: ' +
      content +
      '\nA: '
    );
  }
  ensureDir(dir: string): boolean {
    if (fs.existsSync(dir)) {
      return true;
    }

    const parentDir = path.dirname(dir);
    if (!fs.existsSync(parentDir)) {
      this.ensureDir(parentDir);
    }

    fs.mkdirSync(dir);
    return true;
  }
}
