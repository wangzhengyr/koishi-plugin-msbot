import { Context, Schema, Logger, h } from "koishi";
import { pathToFileURL } from 'url'
import { resolve, dirname } from 'path'
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {} from '@koishijs/assets'
import {} from '@koishijs/plugin-server'
import Model from './model'
import Core from './core'
// import {Config} from './core'


export const name = "ms";

// export interface Config {}

// export const Config: Schema<Config> = Schema.object({})

export interface Config {
  groupMvp: string[],
  groupMvp2: string[],
  goroupLastNew: string[],
  latestNewsIntervalMinutes: number,
  newsPublicBaseUrl: string,
  delAuthority: number,
  groupDailyNews: string[],
  min_default: number,
  max_default: number,
  groupSendMsg: string[],
  names: string[],
  xishu: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
      groupMvp: Schema.array(String).description('全平台mvp配置'),
      groupMvp2: Schema.array(String).description('R2区全平台mvp配置'),
      goroupLastNew: Schema.array(String).description('全平台官方公告配置'),
      groupDailyNews: Schema.array(String).description('今日早报配置'),
      groupSendMsg: Schema.array(String).description('通过api发送消息配置'),

  }).description('群配置'),
  Schema.object({
    latestNewsIntervalMinutes: Schema.number().min(0).default(0).description('获取官网公告的定时任务间隔（分钟，0 表示关闭）'),
    newsPublicBaseUrl: Schema.string().default('').description('官网公告截图公网访问前缀，例如 https://example.com/news'),
  }).description('公告任务配置'),
  Schema.object({
    delAuthority: Schema.number().max(5).min(0).default(2).description('可以删除全部问题的权限配置'),

  }).description('词条相关配置'),
  Schema.object({
    min_default: Schema.number().default(1).description("整数默认最小值"),
    max_default: Schema.number().default(100).description("整数默认最大值（含）"),
  }).description('roll点相关配置'),
  Schema.object({
    names: Schema.array(String).description('角色名配置'),
    xishu: Schema.number().default(0.7).description('xishu'),
  }).description('角色名配置'),
])


const logger = new Logger("ms");


// export const inject = ['database', 'assets', 'server', 'puppeteer']

export const inject = {
  required: ['database', 'server'],
  optional: ['puppeteer', 'assets', 'canvas']
}

export function apply(ctx: Context, config: Config) {
  logger.info("ms插件以开启23333");
  ctx.plugin(Model)
  ctx.plugin(Core, config)


  // ctx.command('test')
  // .action(async ({session}) => {
  //   // let content = session.content
  //   let content = '233<img src="http://gchat.qpic.cn/gchatpic_new/441481065/724117869-3040355442-D52F1FB626A83080FFA1FAC88D108E53/0?term=255&amp;is_origin=0" file="http://gchat.qpic.cn/gchatpic_new/441481065/724117869-3040355442-D52F1FB626A83080FFA1FAC88D108E53/0?term=255&amp;is_origin=0" url="http://gchat.qpic.cn/gchatpic_new/441481065/724117869-3040355442-D52F1FB626A83080FFA1FAC88D108E53/0?term=255&amp;is_origin=0"/>2323'

  //   content = content.replace(/amp;/g, "");
  //   content = content.replace(/file="(.+?)"/, `file="${uuidv4()}"`);
  //   // content = content.replace(/img/g, "image");
  //   // let content = <img src="http://gchat.qpic.cn/gchatpic_new/441481065/724117869-2974150074-A055C8079B7B8D04FD631D0F8213177E/0?term=255&amp;is_origin=0" file="http://gchat.qpic.cn/gchatpic_new/441481065/724117869-2974150074-A055C8079B7B8D04FD631D0F8213177E/0?term=255&amp;is_origin=0" url="http://gchat.qpic.cn/gchatpic_new/441481065/724117869-2974150074-A055C8079B7B8D04FD631D0F8213177E/0?term=255&amp;is_origin=0"/>
  //   // let content = '233<image src="https://koishi.chat/logo.png" url="https://koishi.chat/logo.png"/>2323'

  //   logger.info("转换前:" + content)
  //   if(ctx.assets){
  //     let res = await ctx.assets.transform(content)
  //     // res = res.replace(/url/g, 'src');
  //     logger.info("转换后:" + res)
  //     logger.info(ctx.assets.stats)
  //     // let url = await ctx.assets.upload('https://koishi.chat/logo.png', 'logo.png')
  //     return res
  //   }
  // })


  // // 如果收到“天王盖地虎”，就回应“宝塔镇河妖”
  // ctx.middleware(async (session, next) => {
  //   logger.info(session.content);
  //   // const regex = /学习问(.+?)答(.+?)$/
  //   const regex = /学习问([\s\S]+?)答([\s\S]+?)$/
  //   let matchs = session.content.match(regex)
  //   if (matchs != null && matchs.length === 3) {
  //       let q = matchs[1];
  //       let a = matchs[2];
  //       let fileName = uuidv4() + '.png'
  //       logger.info(q, a);
  //       a = a.replace(/amp;/g, "");
  //       a = a.replace(/file="(.+?)"/, `file="${fileName}}"`);
  //       logger.info(a)
  //       a = await ctx.assets.transform(a)
  //       return a;
  //   } else {
  //     // 如果去掉这一行，那么不满足上述条件的消息就不会进入下一个中间件了
  //     return next();
  //   }
  // });

  // ctx.command('学习', 'q是问题，a是答案')
  // .action(({session}, q, a ) => {
  //   let meessage = session.content
  // })
  // ctx.command("img").action(async ({ session }) => {
  //   // let url = pathToFileURL(resolve(__dirname, 'save/logo.png')).href

  //   const img2 = (
  //     <div>
  //       <img src="https://i.pixiv.re/img-original/img/2022/06/10/21/35/53/98958671_p0.jpg" />
  //       这是图文混合
  //     </div>
  //   );
  //   let src = "https://i.pixiv.re/img-original/img/2022/06/10/21/35/53/98958671_p0.jpg"


  //   let res = await ctx.http.get(src)
  //   logger.info(res)
  //   const filename = `${uuidv4()}.png`;
  //   const filepath = resolve(process.cwd(), 'data', 'locales', 'save', filename);
  //   const dir = dirname(filepath);
  //   if (!fs.existsSync(dir)) {
  //       fs.mkdirSync(dir, { recursive: true });
  //   }

  //   await saveImageToFile(res, filepath);


  //   logger.info(filepath)
  //   const data = await fs.readFileSync(filepath);
  //   const base64Data = Buffer.from(data).toString('base64');
  //   session.send(<img src={'data:image/png;base64,' + base64Data}/>   );

    // const userId = session.userId
    // session.send(<>欢迎 <at id={userId}/> 入群！</>)

    // session.send(h.image('https://i.pixiv.re/img-original/img/2022/06/10/21/35/53/98958671_p0.jpg'), h.text('test'))
  // });

  // async function saveImageToFile(arrayBuffer: string, filename: string) {
  //   return new Promise((resolve, reject) => {
  //     const fileStream = fs.createWriteStream(filename);
  //     fileStream.write(Buffer.from(arrayBuffer));
  //     fileStream.end();
  //     fileStream.on('finish', () => {
  //       logger.info(`Image saved to ${filename}`);
  //       resolve(undefined);
  //     });
  //     fileStream.on('error', (error) => {
  //       reject(error);
  //     });
  //   });
  // }



}

// function showValue(value) {
//   return `${typeof value} ${JSON.stringify(value)}`;
// }

// function findSrcMatches(str: string): string[] {
//   const regex = /src="([^"]*)"/g;
//   const matches: string[] = [];
//   let match: RegExpExecArray | null;

//   while ((match = regex.exec(str)) !== null) {
//       matches.push(match[1]);  // 添加匹配到的内容到数组中
//   }

//   return matches;

// }
