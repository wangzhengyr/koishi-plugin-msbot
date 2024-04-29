import { Context, noop, Logger, h } from 'koishi'
import { v4 as uuidv4 } from 'uuid';
import { getQuestionByquestion,getQAndAByQestion, addQuestion, buildAnswer, buildQuestion, addQestuinAndAnswer, getQuestionsByAnswerId, getQuestionsByKey, getAnswerBykey, delQestionsByQuestion, getLastNews, getAllNewMessage, createNewMessage} from './model';
import { Config } from './index'
import {} from 'koishi-plugin-adapter-onebot'
import {} from 'koishi-plugin-puppeteer'
import { newData, newMessage } from './model'


// 整体导出对象形式的插件
// export interface Config {
//     onebotMvp?: string
// }

  
// export const Config: Schema<Config> = Schema.intersect([
//     Schema.object({
//         onebotMvp: Schema.string().description('onebot平台mvp配置'),
//     }).description('mvp配置')
// ])

export const name = 'Core'

const logger = new Logger("core");



export default function apply(ctx: Context, config: Config) {



    ctx.server.post('/mvp', async (c, next) => {
        let url =  c.request.body.url
        ctx.broadcast(config.groupMvp, h.image(url))
        
    })
    ctx.server.post('/mvp2', async (c, next) => {
        let url =  c.request.body.url
        ctx.broadcast(config.groupMvp2, h.image(url))
    })

    ctx.command('ms', "冒险岛相关指令")

    ctx.command('ms/学习 <q:string> <a:text>', 'q是词条，a是词条内容，中间空格隔开')
    .action(async ({session}, q, a) => {
        if(q === undefined || a === undefined) {
            return 
        }

        logger.info("词条是：" +q,"词条内容是："+  a)
        q = q.toLowerCase()
        a = a.replace(/amp;/g, "")
        a = a.replace(/file="(.+?)"/g, (match) => {
            const fileName = uuidv4() + '.png'
            return `file="${fileName}"` // 返回替换后的字符串
        });
        logger.info(a)
        a = await ctx.assets.transform(a)
        let question = buildQuestion(q, 0, 0, session.userId)
        let answer = buildAnswer(a)
        let result = await addQestuinAndAnswer(answer, question, ctx)
        if(result === null || result === undefined) {
            return "词条已存在"
        }else {
            return "添加成功"
        }
    })

    ctx.command('ms/关联 <q1:string> <q2:string>', 'q1是新增的词条，q2是关联的旧词条, 中间空格隔开')
    .action(async ({session}, q1, q2) => {
        if(q1 === undefined || q2 === undefined) {
            return 
        }
        q1 = q1.toLowerCase()
        q2 = q2.toLowerCase()
        let questions = await getQuestionByquestion(q1, ctx)
        let questions2 = await getQuestionByquestion(q2, ctx)
        if(questions) {
            return "新增词条已存在：" + q1
        }
        if(!questions2) {
            return "关联词条不存在：" + q2
       }

       // 取出q2中的answerid字段并赋值给q1
       let question = buildQuestion(q1, questions2.answerid, 0, session.userId)
       await addQuestion(question, ctx)
       return "关联成功"

    })

    ctx.command('ms/查询 <key:string>', "关键字查询，key是要查询的关键字")
    .action(async ({session}, key) => {
        let questions = await getQuestionsByKey(key, ctx)
        let questions2 = await getAnswerBykey(key, ctx)
        
        let result = questions.map((item, index) => `${index + 1}、${item.question}`).join('\n')
        let result2 = questions2.map((item, index) => `${index + 1}、${item.question}`).join('\n')


        

        return `词条名中含有【${key}】的词条为：\n${result}\n词条描述中含有【${key}】的词条为：\n${result2}`
    })
    ctx.command('ms/删除 <q:string>', "删除词条，q是要删除的词条")
    .userFields(['authority'])
    .action (async ({session}, q) => {
        const user = session.user;
        let question = await getQuestionByquestion(q, ctx)
        if(!question) {
            return "词条不存在"
        }
        if(session.userId !== question.createdid && user.authority < 2) {
            return "只能删除自己创建的词条"
        }


        let res = await delQestionsByQuestion(q, question.answerid, session.userId, ctx)
        let num = res.removed
        if(res.removed > 0) {
            return "删除成功"
        }else {
            return "删除失败"
        }
        
        // session.send(`您的权限等级为：${user.authority}`);
    })
   
    // ctx.middleware(async (session, next) => {
    //     logger.info(session.content);
    //     // const regex = /学习问(.+?)答(.+?)$/
    //     const regex = /学习问([\s\S]+?)答([\s\S]+?)$/
    //     let matchs = session.content.match(regex)
    //     if (matchs != null && matchs.length === 3) {
    //         let q = matchs[1];
    //         let a = matchs[2];
            
    //         a = a.replace(/amp;/g, "");
    //         a = a.replace(/file="(.+?)"/g, (match) => {
    //             const fileName = uuidv4() + '.png'
    //             return `file="${fileName}"`; // 返回替换后的字符串
    //         });
    //         logger.info(a)
    //         a = await ctx.assets.transform(a)
    //         let question = buildQuestion(q, 0, 0, session.userId)
    //         let answer = buildAnswer(a)
    //         let result = await addQestuinAndAnswer(answer, question, ctx)
    //         if(result === null || result === undefined) {
    //             return "词条已存在"
    //         }else {
    //             return "添加成功"
    //         }
    //     } else {
    //       // 如果去掉这一行，那么不满足上述条件的消息就不会进入下一个中间件了
    //       return next();
    //     }
    // });


    ctx.middleware(async (session, next) => {
        let content = session.content.replace(/\s/g, '').toLowerCase()
        let qa = await getQAndAByQestion(content, ctx)
        logger.info(qa)
    
        if(!qa) {
            return next()
        }


        // 如果有词条内容，就返回词条内容，并且查询相同词条内容的词条
        let questions = await getQuestionsByAnswerId(qa.id, ctx)
        let result = questions.filter(item => item.question !== content)
        .map(item => item.question).join('、')


        //result(词条王郑是什么、王郑是？、王郑：、王郑】、嘻嘻、哈哈同义。)
        if(result === '') {
            return qa.answer
            
        }else {
            return qa.answer + "\n(词条"+ result +"同义。)"
        }
    })



    ctx.command('ms/lastnew', '获取官网最新公告')
    .action(async ({session}) => {
        const page = await ctx.puppeteer.page()
        page.setViewport({
            width: 1800,
            height: 1532
        })
        const url = `https://maplestory.nexon.net/news`
        try {
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000,
            })
        } catch (error) {
            page.close()
            logger.debug(error)
            return '新闻-打开主页异常。'
        }
        let newsData: newData[] = []
        try {
            newsData = await page.evaluate(() => {

                const list: newData[] = [];
                document.querySelectorAll('li.news-item[data-equalizer=""]').forEach((element, index) => {
                    const type = element?.querySelector('div.label')?.innerHTML
                    const title = element?.querySelectorAll('a')[1]?.innerText
                    const url = element?.querySelectorAll('a')[1]?.href
                    const content = element.querySelector('p').innerText
    
                    list.push({
                        id:index + 1,
                        type,
                        title,
                        url,
                        content,
                    })
                })
                return list
            })
        } catch (error) {
            page.close()
            logger.debug(error)
            return '新闻-无法获取最新公告。'
        }
        

        try {
        // logger.info(newsData)
        // 去数据库比较是否有最新的新闻，并把这些入库
        newsData = await getLastNews(newsData, ctx)
        } catch (error) {
            page.close()
            logger.debug(error)
            return '新闻-数据库操作异常。'
        }



        let message = new Array()
        const newMsgs: newMessage[] = []
        for (const newData of newsData) {
            const newContentUrl = newData.url
            try {
                await page.goto(newContentUrl, {
                    waitUntil: 'networkidle0',
                    timeout: 30000,
                })
            } catch (error) {
                page.close()
                logger.debug(error)
                return '新闻-打开详情页异常。'
            }
            let imageBuffer
            try {
                let content = await page.$('div.component.component-news-article')
                await content.evaluate(() => {
                    document.querySelector('#onetrust-banner-sdk').remove()
                    document.querySelector('.global-header').remove()
                    document.querySelector('#gnt').remove()
                })
                imageBuffer = await content.screenshot({})
            } catch (error) {
                page.close()
                logger.debug(error)
                return '新闻-详情页截图异常。'
            }


            logger.info(imageBuffer.byteLength)

            // message.push([
            //     h.image(imageBuffer, 'image/png'),
            //     h.text('官网有新消息：\n'),
            //     h.text(`标题：${newData.title}\n`),
            //     h.text(`原文：${newData.content}\n`),
            //     h.text(`链接：${newContentUrl}`)
            // ])

            //将图像缓冲区转换为 Base64 编码的字符串
            const base64Image = imageBuffer.toString('base64');

            // 创建数据 URI
            const dataURI = `data:image/png;base64,${base64Image}`;
          
            message.push(
                <>
                <img src={dataURI}/>
                <text content={'官网有新消息：'} />
                <text content={`标题：${newData.title}`} />
                <text content={`原文：${newData.content}`} />
                <text content={`链接：${newContentUrl}`} />
                </>
            )
            newMsgs.push({
                title: newData.title,
                content: newData.content,
                imgbase64: dataURI,
                type: newData.type,
                url: newContentUrl
            })
            

        }

        // 关闭浏览器
        page.close()



        message.forEach((msg) => {
            // let res = config.onebotLastNew.map(item => 'onebot:' + item)
            ctx.broadcast(config.goroupLastNew, msg)
        
        })
        

        await createNewMessage(newMsgs, ctx)
        
        return
    })
    ctx.command('ms/公告', '获取官方最新公告')
    .alias('官网', 'new')
    .action(async ({session}) => {
       let datas = await getAllNewMessage(ctx)
    //    const message = datas.map(obj => {
    //     return Object.values(obj);
    //   })
    datas.forEach(msg => {
        session.send(
            <>
            <img src={msg.imgbase64}/>
            <text content={'官网有新消息：'} />
            <text content={`标题：${msg.title}`} />
            <text content={`原文：${msg.content}`} />
            <text content={`链接：${msg.url}`} />
            </>
        )
      })
      return

    })

    ctx.command('test')
    .action(async ({session}) => {
        let htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>柱状图</title>
            <link rel="stylesheet" href="styles.css" />
          </head>
        
          <style>
            .chart {
              width: 400px;
              height: 300px;
              margin: 50px auto;
              border: 1px solid #ccc;
              display: flex;
              justify-content: space-around;
              align-items: flex-end;
            }
        
            .bar {
              width: 50px;
              background-color: #007bff;
              transition: height 0.5s ease;
            }
          </style>
          <body>
            <div class="chart" id="app">
              <div class="bar" style="height: 100px"></div>
              <div class="bar" style="height: 150px"></div>
              <div class="bar" style="height: 80px"></div>
              <div class="bar" style="height: 200px"></div>
            </div>
          </body>
        </html>
        
        `
        // const page = await ctx.puppeteer.browser.newPage()
        // await page.setContent(htmlContent)
        // const clip = await page.evaluate(() => {
        //     const songList = document.getElementById('app')
        //     const { left: x, top: y, width, height } = songList.getBoundingClientRect()
        //     return { x, y, width, height }
        // })
        // const imageBuffer = await page.screenshot({clip})
        // page.close()

        
        // return h.image(imageBuffer, 'image/png')

        const page = await ctx.puppeteer.page()
        await page.setViewport({
            width: 1800,
            height: 1532
        })

        const url = `https://mapleranks.com/u/leslee521`
        await page.goto(url, {
            waitUntil: 'load',
            timeout: 30000,
        })

        // const s = await page.$('#content')
        // page.on('load', async() => {
        //     logger.info('load')

        // })
        const clip = await page.evaluate(() => {
            const songList = document.getElementById('content')
            eval('zmChs(14)')
            
            const { left: x, top: y, width, height } = songList.getBoundingClientRect()
            return { x, y, width, height }
        })
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 2 秒钟


        const imageBuffer = await page.screenshot({clip})
        logger.info('233')
        page.close()
        return h.image(imageBuffer, 'image/png')

    })


    ctx.command('test2')
    .action(async ({session}) => {
        const page = await ctx.puppeteer.page()
        page.setViewport({
            width: 1800,
            height: 1532
        })
        // const url = `https://maplestory.nexon.net/news`
        // await page.goto(url, {
        //     waitUntil: 'networkidle0',
        //     timeout: 30000,
        // })

        // const newsData = await page.evaluate(() => {
        //     // // 获取新闻类型
        //     // let type = document.querySelectorAll('li.news-item[data-equalizer=""]')[1].querySelector('div.label').innerHTML

        //     // // 获取新闻标题
        //     // const title = document.querySelectorAll('li.news-item[data-equalizer=""]')[1]?.querySelectorAll('a')[1]?.innerText
            
        //     // // 获取新闻详情url
        //     // const url = document.querySelectorAll('li.news-item[data-equalizer=""]')[1]?.querySelectorAll('a')[1]?.href

        //     const list: newData[] = [];
        //     document.querySelectorAll('li.news-item[data-equalizer=""]').forEach(element => {
        //         const type = element?.querySelector('div.label')?.innerHTML
        //         const title = element?.querySelectorAll('a')[1]?.innerText
        //         const url = element?.querySelectorAll('a')[1]?.href
        //         const content = element.querySelector('p').innerText

        //         list.push({
        //             type,
        //             title,
        //             url,
        //             content,
        //         })
        //     })
        //     return list
        // })

        // logger.info(newsData)


        // let message = new Array()
        // for (const newData of newsData) {
        //     const newContentUrl = newData.url
        //     await page.goto(newContentUrl, {
        //         waitUntil: 'networkidle0',
        //         timeout: 30000,
        //     })
        //     let content = await page.$('div.component.component-news-article')
        //     await content.evaluate(() => {
        //         document.querySelector('#onetrust-banner-sdk').remove()
        //         document.querySelector('.global-header').remove()
        //         document.querySelector('#gnt').remove()
        //     })
        //     let imageBuffer = await content.screenshot({})
        //     logger.info(imageBuffer.byteLength)

        //     message.push([
        //         h.image(imageBuffer, 'image/png'),
        //         h.text('官网有新消息：\n'),
        //         h.text(`标题：${newData.title}\n`),
        //         h.text(`原文：${newData.content}\n`),
        //         h.text(`链接：${newContentUrl}`)
        //     ])
        // }

        // message.forEach((msg) => {
        //     session.send(msg)
        // })
        // return

        const newContent = `https://maplestory.nexon.net/news/91252/cash-shop-update-on-april-17`
        await page.goto(newContent, {
            waitUntil: 'networkidle0',
            timeout: 30000,
        })

        let clip = await page.evaluate(() => {
            // document.querySelector("div[class='component component-news-article']")?.style
            // (document.querySelector("div[class='component component-news-article']") as HTMLElement).style.width = '400px'
            const contentElement = document.querySelector("div[class='component component-news-article']")
            
            // (document.querySelector("div[class='component component-news-article']") as HTMLElement).style.height = height * 0.9.valueOf() + 'px'
            // let h = (document.querySelectorAll('div.small-12.small-centered.columns')[1] as HTMLElement).offsetWidth;
            // (document.querySelectorAll('div.small-12.small-centered.columns')[1] as HTMLElement).style.width = h * 1.4.valueOf() + 'px'
            const { left: x, top: y, width, height } = contentElement.getBoundingClientRect();

            return { x, y, width, height }
        })

        logger.info(clip)

        let content = await page.$('div.component.component-news-article')
        // let content = await page.$('div.small-12.small-centered.columns')
       

        await content.evaluate(() => {
            document.querySelector('#onetrust-banner-sdk').remove()
            document.querySelector('.global-header').remove()
            document.querySelector('#gnt').remove();

        })
        // await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒钟



        let imageBuffer = await content.screenshot({})
        logger.info(imageBuffer.byteLength)
        page.close()

        // 将图像缓冲区转换为 Base64 编码的字符串
        // const base64Image = imageBuffer.toString('base64');

        // // 创建数据 URI
        // const dataURI = `data:image/png;base64,${base64Image}`;

        session.send([
            h.image(imageBuffer, 'image/png'),
            h.text('官网有新消息:\n'),
            h.text(`标题：\n`),
            h.text(`原文：\n`),
            h.text(`链接：${newContent}`)
        ])
        return 
    })

    

    ctx.on('bot-status-updated', (bot) => {
        if (bot.status === 1) {
          // 这里的 userId 换成你的账号
          bot.sendPrivateMessage('1019085793', '我上线了~')
        }
      })
}

