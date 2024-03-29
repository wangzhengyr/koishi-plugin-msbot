import { Context, Schema, Logger, h } from "koishi";
import { pathToFileURL } from 'url'
import { resolve, dirname } from 'path'
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const name = "ms";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

const logger = new Logger("ms");

export function apply(ctx: Context) {
  logger.info("ms插件以开启233");
  // ctx.command('学习 <q> <a>', 'q是问题，a是答案')
  // .action((_, q, a) => {
  //   logger.info(q, a)
  // })


  // 如果收到“天王盖地虎”，就回应“宝塔镇河妖”
  ctx.middleware((session, next) => {
    logger.info(session.content);
    // const regex = /学习问(.+?)答(.+?)$/
    const regex = /学习问([\s\S]+?)答([\s\S]+?)$/
    let matchs = session.content.match(regex)
    if (matchs != null && matchs.length === 3) {
        let q = matchs[1];
        let a = matchs[2];
        logger.info(q, a);
        a = a.replace(/amp;/g, "");
        let urls = findSrcMatches(a)
        logger.info(urls)
      return a;
    } else {
      // 如果去掉这一行，那么不满足上述条件的消息就不会进入下一个中间件了
      return next();
    }
  });

  // ctx.command('学习', 'q是问题，a是答案')
  // .action(({session}, q, a ) => {
  //   let meessage = session.content
  // })
  ctx.command("img").action(async ({ session }) => {
    let url = pathToFileURL(resolve(__dirname, 'save/logo.png')).href

    const img2 = (
      <div>
        <img src="https://i.pixiv.re/img-original/img/2022/06/10/21/35/53/98958671_p0.jpg" />
        这是图文混合
      </div>
    );
    let src = "https://i.pixiv.re/img-original/img/2022/06/10/21/35/53/98958671_p0.jpg"

    session.send(img2);
    let res = await ctx.http.get(src)
    logger.info(res)
    const filename = `${uuidv4()}.png`;
    const filepath = resolve(__dirname, 'save', filename); // 获取文件的绝对路径
    const dir = dirname(filepath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    saveImageToFile(res, filepath);




    // const userId = session.userId
    // session.send(<>欢迎 <at id={userId}/> 入群！</>)

    // session.send(h.image('https://i.pixiv.re/img-original/img/2022/06/10/21/35/53/98958671_p0.jpg'), h.text('test'))
  });

  function saveImageToFile(arrayBuffer: string, filename: string) {
    const fileStream = fs.createWriteStream(filename);
    fileStream.write(Buffer.from(arrayBuffer));
    fileStream.end();
    logger.info(`Image saved to ${filename}`);
}

}

function showValue(value) {
  return `${typeof value} ${JSON.stringify(value)}`;
}

function findSrcMatches(str: string): string[] {
  const regex = /src="([^"]*)"/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
      matches.push(match[1]);  // 添加匹配到的内容到数组中
  }

  return matches;

}
