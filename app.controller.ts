import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ReportService } from './reportService';

@Controller('chatRobot')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/feishuMsgReceive')
  @HttpCode(200)
  async getFeishuMsgReceive(@Body() body) {
    Logger.log('feishuMsgReceive body:', body);
    this.appService.getFeishuMsgReceive(body).then((res) => {
      Logger.log('res', res);
    });
    return body;
  }

  @Post('/feishuFeedback')
  @HttpCode(200)
  async feishuFeedback(@Body() body) {
    Logger.log('feishuFeedback body:', body);
    if (body.type == 'url_verification') {
      return {
        challenge: body.challenge,
      };
    }
    if (body.action.value.type == 'reportRetry') {
      this.appService
        .analysisAndSummarizeFile(body.action.value.filePath, body.open_id)
        .then((res) => {
          Logger.log('res', res);
        });
    }
    return body;
  }

  @Post('/testReport')
  @HttpCode(200)
  async testReport(@Body() body) {
    Logger.log('testReport body:', body);
    const reportService = new ReportService();
    const contents = await reportService.getTxt(
      // '/Users/sc-dz003-141/Downloads/2022中国厨房电器趋势报告.pdf',
      // '/Users/sc-dz003-141/Downloads/2022中国洗碗机市场消费趋势报告.pdf',
      // '/Users/sc-dz003-141/Downloads/金属3D打印 铂力特 210905.pdf',
      // '/Users/sc-dz003-141/Downloads/报告正式发布版.pdf',
      body.action.value.filePath,
    );
    return await reportService.trans(contents.content);
  }

  @Post('/testGetContent')
  @HttpCode(200)
  async testGetContent(@Body() body) {
    Logger.log('testGetContent body:', body);
    const reportService = new ReportService();
    const data = await reportService.getTxt(
      '/Users/sc-dz003-141/Downloads/金属3D打印 铂力特 210905.pdf',
    );
    // Logger.log('data', data);
    return '';
  }

  @Post('/testFeishuMsg')
  @HttpCode(200)
  async testFeishuMsg(@Body() body) {
    Logger.log('testReport body:', body);
    const msgContent =
      // 'undefined内容分析:\n' +
      // '**【一句话描述】 **厨房嵌入式、集成、一体化行业具有巨大的市场潜力NaN厨房嵌入式、集成、一体化是一个发展迅速的领域，其中的竞争公司包括万家乐厨房空间、方太集成烹饪中心X系列和老板电器，它们都拥有自己的特点和核心优势。这个行业的市场空间很大，但竞争激烈，需要不断进行技术创新和产品升级。\n' +
      // '**这个行业的核心技术是什么 **嵌入式、集成、一体化\n' +
      // '**这个行业的市场空间有多大 **undefined\n' +
      // '**这个行业里的竞争格局是什么样子的 **undefined\n' +
      // '**这个行业里都有哪些竞争公司 **undefined\n' +
      // '**在这个行业里， 每个竞争公司都有什么特点 **undefined\n' +
      // '**在这个行业里， 每个竞争公司的市占率是多少 **undefined\n' +
      // '**在这个行业里，每个竞争公司的核心优势是什么**万家乐厨房空间：产品质感强，功能齐全；方太集成烹饪中心X系列：多功能集成产品；老板电器：高颜值和吸烟性能\n' +
      // '**在这个行业里，每个竞争公司的技术壁垒是什么**无\n' +
      // '**这个行业今年的收入、盈利或者亏损分别是多少**无\n' +
      '**这个行业今年的情况和往年相比怎么样**无undefined内容分析\\nasd';
    await this.appService.client.im.message
      .create({
        data: {
          receive_id: 'ou_58d42dc59d9f1d6605df1ce4b8d765ad',
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
            '    }\n' +
            '  ],\n' +
            '  "header": {\n' +
            '    "template": "blue",\n' +
            '    "title": {\n' +
            '      "content": "研报助手",\n' +
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
    return 'su';
  }
}
