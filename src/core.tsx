import { Context, noop, Logger, h, Session } from 'koishi'
import { v4 as uuidv4 } from 'uuid';
import { getQuestionByquestion,getQAndAByQestion, addQuestion, buildAnswer, buildQuestion, addQestuinAndAnswer, getQuestionsByAnswerId, getQuestionsByKey, getAnswerBykey, delQestionsByQuestion, getLastNews, getAllNewMessage, addNews} from './model';
import { Config } from './index'
import {} from 'koishi-plugin-adapter-onebot'
import {} from 'koishi-plugin-puppeteer'
import { newData, newMessage, characterData, gmsInfo } from './model'
import { Page } from 'puppeteer-core'
import { resolve, dirname } from 'path'
import fs from 'fs';




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
        let url =  c.request.body.url;
        // ctx.broadcast([...config.groupMvp], h.image(url))
        await (ctx as any).broadcast([...config.groupMvp], h.image(url))

        c.body = {
            code: 200,
            msg: 'success'
        }
        return c
        
    })
    ctx.server.post('/mvp2', async (c, next) => {
        let url =  c.request.body.url
        // ctx.broadcast([...config.groupMvp2], h.image(url))
        await (ctx as any).broadcast([...config.groupMvp2], h.image(url))
        c.body = {
            code: 200,
            msg: 'success'
        }
        return c
    })

    ctx.command('ms', "冒险岛相关指令，如需了解指令详细使用在后面加-h")
    .example('学习 -h')
    .example('搜索 -h')
    .example('删除 -h')
    .example('关联 -h')

    ctx.command('ms/学习 <q:string> <a:text>', '学习词条')
    .usage('学习词条，第一个参数是词条，第二个参数是词条内容，中间空格隔开')
    .example('学习 蠢猫 蠢猫不在了')
    .example('学习 （不输入参数则根据提示输入内容）')
    .action(async ({session}, q, a) => {
        if(q === undefined) {
            await session.send('请在下一条消息输入词条名称')
            q = await session.prompt()
            if (!q) return <>
                <at id={session.userId} /> 输入超时。
            </>
            const selectQ = await getQuestionByquestion(q, ctx)
            if(selectQ) return "词条已存在"
            await session.send('请在下一条消息输入词条内容')
            a = await session.prompt()
            if (!a) return <>
                <at id={session.userId} /> 输入超时。
            </>
        }

        q = q.toLowerCase()

        let selectQ = await getQuestionByquestion(q, ctx)
        if(selectQ) return "词条已存在"

        if(a === undefined) {
            await session.send(`已输入词条【${q}】,请在下一条消息输入词条内容`)
            a = await session.prompt()
            if (!a) return <>
                <at id={session.userId} /> 输入超时。
            </>
        }


        logger.info("词条是：" +q,"词条内容是："+  a)


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

    ctx.command('ms/关联 <q1:string> <q2:string>', '关联词条')
    .usage('关联词条，第一个参数是新增的词条，第二个参数是需要关联的词条，关联后词条内容都一样，中间空格隔开')
    .example('关联 cm 蠢猫')
    .action(async ({session}, q1, q2) => {
        if(q1 === undefined || q2 === undefined) {
            session.execute('关联 -h')
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

    ctx.command('ms/搜索 <key:string>', "关键字搜索")
    .usage("关键字搜索，参数为需要搜索的关键字，可根据关键字搜索词条和词条内容")
    .example("搜索 蠢猫")
    .example("搜索 （不输入参数则根据提示输入内容）")
    .action(async ({session}, key) => {
        if(key === undefined) {
            await session.send('请在下一条消息输入要搜索的关键字')
            key = await session.prompt()
            if (!key) return <>
                <at id={session.userId} /> 输入超时。
            </>
        }


        let questions = await getQuestionsByKey(key, ctx)
        let questions2 = await getAnswerBykey(key, ctx)
        
        let result = questions.map((item, index) => `${index + 1}、${item.question}`).join('\n')
        let result2 = questions2.map((item, index) => `${index + 1}、${item.question}`).join('\n')


        

        return `词条名中含有【${key}】的词条为：\n${result}\n词条描述中含有【${key}】的词条为：\n${result2}`
    })
    ctx.command('ms/删除 <q:string>', "删除词条")
    .usage("删除词条，参数为需要删除的词条名称，只能删除自己创建的词条")
    .example("删除 蠢猫")
    .example("删除 （不输入参数则根据提示输入内容）")
    .userFields(['authority'])
    .action (async ({session}, q) => {

        if(q === undefined) {
            await session.send('请在下一条消息输入要搜删除的词条名称')
            q = await session.prompt()
            if (!q) return <>
                <at id={session.userId} /> 输入超时。
            </>
        }
        const user = session.user;
        let question = await getQuestionByquestion(q, ctx)
        if(!question) {
            return "词条不存在"
        }
        if(session.userId !== question.createdid && user.authority <= config.delAuthority) {
            return "只能删除自己创建的词条"
        }


        let res = await delQestionsByQuestion(q, question.answerid, session.userId, ctx)
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
            logger.error(error)
            logger.error('新闻-打开主页异常。')
            session.send('新闻-打开主页异常。')
        }
        let newData: newData
        let newDataId
        try {
            newData = await page.evaluate(() => {

                const list: newData[] = [];
                const element = document.querySelector('li.news-item[data-equalizer=""]')
                const type = element?.querySelector('div.label')?.innerHTML
                const title = element?.querySelectorAll('a')[1]?.innerText
                let str = element?.querySelectorAll('a')[1]?.href
                const url = str.substring(0,str.lastIndexOf('/'))
                const content = element?.querySelector('p')?.innerText

                return {
                    type,
                    title,
                    url,
                    content,
                    isNew: true
                }

                // document.querySelectorAll('li.news-item[data-equalizer=""]').forEach((element, index) => {
                //     const type = element?.querySelector('div.label')?.innerHTML
                //     const title = element?.querySelectorAll('a')[1]?.innerText
                //     let str = element?.querySelectorAll('a')[1]?.href
                //     const url = str.substring(0,str.lastIndexOf('/'))
                //     const content = element?.querySelector('p')?.innerText
                //     // list.push({
                //     //     id:index + 1,
                //     //     type,
                //     //     title,
                //     //     url,
                //     //     content
                //     // })
                // })
                // return list
            })
        } catch (error) {
            page.close()
            logger.error(error)
            logger.error('新闻-无法获取最新公告。')
            session.send('新闻-无法获取最新公告。')
        }
        

        try {
        // logger.info(newsData)
        // 去数据库比较是否有最新的新闻，并把这些入库
        newDataId = await getLastNews(newData, ctx)
        logger.info(newData)
        } catch (error) {
            page.close()
            logger.error(error)
            logger.error('新闻-数据库操作异常。')
            session.send('新闻-数据库操作异常。')
            return
        }

        if(newDataId) {
            logger.info('检测到有新公告')
            const newContentUrl = newData.url

            try {
                await page.goto(newContentUrl, {
                    waitUntil: 'networkidle0',
                    timeout: 30000,
                })
            } catch (error) {
                page.close()
                logger.error(error)
                logger.error('新闻-打开详情页异常。')
                session.send('新闻-打开详情页异常。')
            }
            let imageBuffer
            let data
            try {
                let content = await page.$('div.component.component-news-article')
                data = await content.evaluate(() => {
                    const MAXHIGHT = 15000
                    let isOverHight = false
                    document.querySelector('#onetrust-banner-sdk').remove()
                    document.querySelector('.global-header').remove()
                    document.querySelector('#gnt').remove();
                    let hight = (document.querySelector('div.component.component-news-article') as HTMLElement).offsetHeight
                    if(hight > MAXHIGHT) {
                        isOverHight = true;
                        (document.querySelector('div.component.component-news-article') as HTMLElement).style.height = MAXHIGHT + 'px'
                    }
                    hight = (document.querySelector('div.component.component-news-article') as HTMLElement).offsetHeight

                    return {
                        hight,
                        isOverHight
                    }
                })
                logger.info("链接：" + newContentUrl)
                logger.info("页面高度：" + data.hight)
                imageBuffer = await content.screenshot({})
            } catch (error) {
                page.close()
                logger.error(error)
                logger.error('新闻-详情页截图异常。')
                session.send('新闻-详情页截图异常。')
            }

            try {
                logger.info(imageBuffer.byteLength)
                //将图像缓冲区转换为 Base64 编码的字符串
                const base64Image = imageBuffer.toString('base64')
    
                // 创建数据 URI
                const dataURI = `data:image/png;base64,${base64Image}`

                const filename = `${uuidv4()}.png`;
                const filepath = resolve(process.cwd(), 'data', 'locales', 'news', filename);
                const dir = dirname(filepath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                

                await fs.promises.writeFile(filepath, Buffer.from(imageBuffer))
                // await saveImageToFile(imageBuffer, filepath);
                logger.info('保存完成：' + filepath)

                newData.imgbase64 = "file://" + filepath
                newData.isOverHight = data.isOverHight
                await ctx.database.set('newData', {
                    id: newDataId
                },newData)
                let msg = <>
                    <img src={dataURI}/><br/>
                    <text content={'官网有新消息：'} /><br/>
                    <text content={`标题：${newData.title}`} /><br/>
                    <text content={`原文：${newData.content}`} /><br/>
                    <a href={newData.url} >链接：</a><br/>
                    {data.isOverHight ? <text content={`提示：由于内容较多，截图只显示部分页面数据`} /> : null}
                    </>
                await (ctx as any).broadcast([...config.goroupLastNew], msg)

                await addNews(newData, ctx)
            } catch (error) {
                page.close()
                logger.error(error)
                logger.error('新闻-发送新闻异常。')
                session.send('新闻-发送新闻异常。')
            }

        }else {
            logger.info('没有新公告')

        }

        // 关闭浏览器
        page.close()
        return
        
     
    })
    ctx.command('ms/公告', '获取官方最新公告')
    .alias('官网', 'new')
    .option('event', '-e 活动公告')
    .option('sale', '-s 商城公告')
    .option('maintenance', '-m 维护公告')
    .option('general', '-g 一般公告')
    .option('community', '-c 社区公告')
    .action(async ({session, options}) => {
        let map = {
            'EVENTS': '活动公告',
            'SALE': '商城公告',
            'MAINTENANCE': '维护公告',
            'GENERAL': '一般公告',
            'COMMUNITY': '社区公告',
            'NEW': '最新公告'
        
        }

        let type = 'NEW'

        if(options.event) type = 'EVENTS'
        if(options.sale) type = 'SALE'
        if(options.maintenance) type = 'MAINTENANCE'
        if(options.general) type = 'GENERAL'
        if(options.community) type = 'COMMUNITY'
        let newDatas
        if(type != 'NEW') {
    
            newDatas = await ctx.database.get('newData', {
                type,
                isNew: false
            })

        }else {
            newDatas = await ctx.database.get('newData', {
                isNew: true
            })
        }

        if(newDatas.length === 0) {
            return `暂无${map[type]}`
        }
        let msg = <>
        <img src={newDatas[0].imgbase64}/><br/>
        <text content={'官网有新消息：'} /><br/>
        <text content={`标题：${newDatas[0].title}`} /><br/>
        <text content={`原文：${newDatas[0].content}`} /><br/>
        <a href={newDatas[0].url} >链接：</a><br/>
        {newDatas[0].isOverHight ? <text content={`提示：由于内容较多，截图只显示部分页面数据`} /> : null}
        </>
        return msg
        




    //    let datas = await getAllNewMessage(ctx)
    //    const message = datas.map(obj => {
    //     return Object.values(obj);
    //   })
    // datas.forEach(msg => {
    //     session.send(
    //         <>
    //         <img src={msg.imgbase64}/> <br />
    //         <text content={'官网有新消息：'} /> <br />
    //         <text content={`标题：${msg.title}`} /> <br />
    //         <text content={`原文：${msg.content}`} /> <br />
    //         <a href={msg.url}>链接：</a><br />
    //         {msg.isOverHight ? <text content={`提示：由于内容较多，截图只显示部分页面数据`} /> : null}
    //         </>
    //     )
    //   })
    //   return

    })

    ctx.command('ms/联盟绑定 <name:string>', '角色名称与当前账号绑定')
    .example('联盟绑定 leslee520')
    .action(async ({session}, name) => {
        if(!name) {
            await session.send('请在下一条消息输入要绑定的角色名')
            const cname = await session.prompt()
            if (!cname) return <>
                <at id={session.userId} /> 输入超时。
            </>
            name = cname
        }

        let msg = await bindGms(ctx, name, session.userId)

        return msg



    })



    ctx.command('ms/联盟查询 <name:string>', '查询角色信息')
    .example('联盟查询 leslee520')
    .action(async ({session}, name) => {
        if(!name) {
            let info: gmsInfo[] = await ctx.database.get('gmsInfo', {
                userId: session.userId,
            })
            if(info.length == 0) {
                await session.send('当前未绑定角色，请在下一条消息输入要绑定的角色名')
                const cname = await session.prompt()
                if (!cname) return <>
                    <at id={session.userId} /> 输入超时。
                </>
                name = cname
               return bindGms(ctx, name, session.userId)
            }
            name = info[0].name
        }

        const url = `https://api.maplestory.gg/v2/public/character/gms/${name}`

        try {
            await ctx.http.get(url)
        } catch (error) {
            return '角色不存在'
        }

        const page = await ctx.puppeteer.page()
        // const browser = ctx.puppeteer.browser

        try {
            const characterData = await getCharacterData(name, page, session)

            if(characterData == null) return '角色不存在'
    
            let imageBuffer = await generateCharacterImage(page, characterData, config)
            page.close()

            return h.image(imageBuffer, 'image/png')

        } catch (error) {
            page.close()
        }


        return '联盟查询异常'



    })





    // ctx.command('test2')
    // .action(async ({session}) => {
    //     const page = await ctx.puppeteer.page()
    //     page.setViewport({
    //         width: 1800,
    //         height: 1532
    //     })
    //     // const url = `https://maplestory.nexon.net/news`
    //     // await page.goto(url, {
    //     //     waitUntil: 'networkidle0',
    //     //     timeout: 30000,
    //     // })

    //     // const newsData = await page.evaluate(() => {
    //     //     // // 获取新闻类型
    //     //     // let type = document.querySelectorAll('li.news-item[data-equalizer=""]')[1].querySelector('div.label').innerHTML

    //     //     // // 获取新闻标题
    //     //     // const title = document.querySelectorAll('li.news-item[data-equalizer=""]')[1]?.querySelectorAll('a')[1]?.innerText
            
    //     //     // // 获取新闻详情url
    //     //     // const url = document.querySelectorAll('li.news-item[data-equalizer=""]')[1]?.querySelectorAll('a')[1]?.href

    //     //     const list: newData[] = [];
    //     //     document.querySelectorAll('li.news-item[data-equalizer=""]').forEach(element => {
    //     //         const type = element?.querySelector('div.label')?.innerHTML
    //     //         const title = element?.querySelectorAll('a')[1]?.innerText
    //     //         const url = element?.querySelectorAll('a')[1]?.href
    //     //         const content = element.querySelector('p')?.innerText

    //     //         list.push({
    //     //             type,
    //     //             title,
    //     //             url,
    //     //             content,
    //     //         })
    //     //     })
    //     //     return list
    //     // })

    //     // logger.info(newsData)


    //     // let message = new Array()
    //     // for (const newData of newsData) {
    //     //     const newContentUrl = newData.url
    //     //     await page.goto(newContentUrl, {
    //     //         waitUntil: 'networkidle0',
    //     //         timeout: 30000,
    //     //     })
    //     //     let content = await page.$('div.component.component-news-article')
    //     //     await content.evaluate(() => {
    //     //         document.querySelector('#onetrust-banner-sdk').remove()
    //     //         document.querySelector('.global-header').remove()
    //     //         document.querySelector('#gnt').remove()
    //     //     })
    //     //     let imageBuffer = await content.screenshot({})
    //     //     logger.info(imageBuffer.byteLength)

    //     //     message.push([
    //     //         h.image(imageBuffer, 'image/png'),
    //     //         h.text('官网有新消息：\n'),
    //     //         h.text(`标题：${newData.title}\n`),
    //     //         h.text(`原文：${newData.content}\n`),
    //     //         h.text(`链接：${newContentUrl}`)
    //     //     ])
    //     // }

    //     // message.forEach((msg) => {
    //     //     session.send(msg)
    //     // })
    //     // return

    //     const newContent = `https://maplestory.nexon.net/news/91252/cash-shop-update-on-april-17`
    //     await page.goto(newContent, {
    //         waitUntil: 'networkidle0',
    //         timeout: 30000,
    //     })

    //     let clip = await page.evaluate(() => {
    //         // document.querySelector("div[class='component component-news-article']")?.style
    //         // (document.querySelector("div[class='component component-news-article']") as HTMLElement).style.width = '400px'
    //         const contentElement = document.querySelector("div[class='component component-news-article']")
            
    //         // (document.querySelector("div[class='component component-news-article']") as HTMLElement).style.height = height * 0.9.valueOf() + 'px'
    //         // let h = (document.querySelectorAll('div.small-12.small-centered.columns')[1] as HTMLElement).offsetWidth;
    //         // (document.querySelectorAll('div.small-12.small-centered.columns')[1] as HTMLElement).style.width = h * 1.4.valueOf() + 'px'
    //         const { left: x, top: y, width, height } = contentElement.getBoundingClientRect();

    //         return { x, y, width, height }
    //     })

    //     logger.info(clip)

    //     let content = await page.$('div.component.component-news-article')
    //     // let content = await page.$('div.small-12.small-centered.columns')
       

    //     await content.evaluate(() => {
    //         document.querySelector('#onetrust-banner-sdk').remove()
    //         document.querySelector('.global-header').remove()
    //         document.querySelector('#gnt').remove();

    //     })
    //     // await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒钟


    //     let imageBuffer = await content.screenshot({})
    //     logger.info(imageBuffer.byteLength)
    //     page.close()

    //     // 将图像缓冲区转换为 Base64 编码的字符串
    //     // const base64Image = imageBuffer.toString('base64');

    //     // // 创建数据 URI
    //     // const dataURI = `data:image/png;base64,${base64Image}`;

    //     session.send([
    //         h.image(imageBuffer, 'image/png'),
    //         h.text('官网有新消息:\n'),
    //         h.text(`标题：\n`),
    //         h.text(`原文：\n`),
    //         h.text(`链接：${newContent}`)
    //     ])
    //     return 
    // })

    // ctx.command('test3')
    // .action(async (session) => {
    //     let group = config.goroupLastNew
    //     logger.info(group);
    //     // let res = await ctx.broadcast([...group], "全体目光先我看齐")
    //     let res = await (ctx as any).broadcast([...group], "全体目光先我看齐")

    //     logger.info("发送消息：" + res)
    // })
    

    ctx.on('bot-status-updated', (bot) => {
        if (bot.status === 1) {
          // 这里的 userId 换成你的账号
          bot.sendPrivateMessage('1019085793', '我上线了~')
        }
      })
}



async function getCharacterData(name:string, page: Page, session: Session): Promise<characterData>{



        // 获取数据
        // let page = await browser.newPage()
        let url = `https://mapleranks.com/u/${name}`
        try {
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000,
            })
        } catch (error) {
            page.close()
            logger.debug(error)
            session.send('联盟查询-打开主页异常')
            return null
        }
        let characterData: characterData = await page.evaluate(() => {
            if(document.querySelector('h2')?.innerText == 'Not Found') {
                return null
            }
            
            
            
            let chartData
            let chart
            let labels
            if (eval("typeof Chart !== 'undefined'")) {
                const charts = eval('Chart.instances');

                for (const key in charts) {
                    if (charts.hasOwnProperty(key)) {
                        const chart = charts[key];
                        if (chart.config.type === 'bar') {
                            chartData = chart
                            // 这里可以对找到的图表实例进行进一步操作
                        }
                    }
                }
                if(chartData) {
                    chart = chartData.data.datasets[0].data.slice(-14)
                    labels = chartData.data.labels.slice(-14)
                }
              }




            const avatar = document.querySelector('img')?.src

            const name = document.querySelector('h3')?.innerText
            const lv = document.querySelector('h5')?.innerText
            let job = document.querySelector('p')?.innerText.split('in')[0].trim()
            let server = document.querySelector('p')?.innerText.split('in')[1]
            const rankInKOnJob = (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[0]?.children[0]?.children[0] as HTMLElement)?.innerText
            const rankInK = (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[0]?.children[1]?.children[0] as HTMLElement)?.innerText
            const rankInROnJob = (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[0]?.children[2]?.children[0] as HTMLElement)?.innerText
            const rankInR = (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[0]?.children[3]?.children[0] as HTMLElement)?.innerText
            const legion_rank = (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[1]?.children[0]?.children[0] as HTMLElement)?.innerText
            const legion_lv = (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[1]?.children[1]?.children[0] as HTMLElement)?.innerText
            let legion_power_value =  (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[1]?.children[2]?.children[0]?.childNodes[0] as HTMLInputElement)?.value
            
            // 联盟战力需要转数字
            let legion_power
            if (legion_power_value) {
                const str = legion_power_value.replace(/,/g, '');
                // 转换为数字
                const e = parseInt(str);
                legion_power = 999 < e && e < 1e6
                    ? Number((e / 1e3).toFixed(1)) + "K"
                    : 1e6 <= e && e < 1e9
                        ? Number((e / 1e6).toFixed(2)) + "M"
                        : 1e9 <= e && e < 1e12
                            ? Number((e / 1e9).toFixed(2)) + "B"
                            : 1e12 <= e && e < 1e15
                                ? Number((e / 1e12).toFixed(2)) + "T"
                                : "" + e;
            }
            
            

            const legion_bi = (document.querySelector('div.d-flex.justify-content-between.my-2')?.childNodes[5]?.childNodes[0] as HTMLInputElement)?.value
            const chengjiuzhi = (document.querySelectorAll('ul.list-group.list-group-flush.char-stat-list')[2]?.children[2]?.children[0] as HTMLElement)?.innerText
            const avg_exp_7 = (document.querySelectorAll('div.d-inline-block.pe-3.border-end.char-exp-cell>span')[0]as HTMLElement)?.innerText
            const avg_exp_14 = (document.querySelectorAll('div.d-inline-block.ps-2.char-exp-cell>span')[0]as HTMLElement)?.innerText
            const total_exp_7 = (document.querySelectorAll('div.d-inline-block.pe-3.border-end.char-exp-cell>span')[2]as HTMLElement)?.innerText
            const total_exp_14 = (document.querySelectorAll('div.d-inline-block.ps-2.char-exp-cell>span')[2] as HTMLElement)?.innerText

            const fujin_job_rank_name_1 = document.querySelectorAll('strong')[0]?.innerText
            const fujin_job_rank_name_2 = document.querySelectorAll('strong')[1]?.innerText
            const fujin_job_rank_name_3 = document.querySelectorAll('strong')[2]?.innerText
            const fujin_job_rank_name_4 = document.querySelectorAll('strong')[3]?.innerText
            const fujin_job_rank_name_5 = document.querySelectorAll('strong')[4]?.innerText
            
            const fujin_job_rank_lv_1 = (document.querySelectorAll('div.alert.text-white.py-2>span')[0] as HTMLElement)?.innerText
            const fujin_job_rank_lv_2 = (document.querySelectorAll('div.alert.text-white.py-2>span')[1] as HTMLElement)?.innerText
            const fujin_job_rank_lv_3 = (document.querySelectorAll('div.alert.text-white.py-2>span')[2] as HTMLElement)?.innerText
            const fujin_job_rank_lv_4 = (document.querySelectorAll('div.alert.text-white.py-2>span')[3] as HTMLElement)?.innerText
            const fujin_job_rank_lv_5 = (document.querySelectorAll('div.alert.text-white.py-2>span')[4] as HTMLElement)?.innerText

            const fujin_rank_name_1 = document.querySelectorAll('strong')[5]?.innerText
            const fujin_rank_name_2 = document.querySelectorAll('strong')[6]?.innerText
            const fujin_rank_name_3 = document.querySelectorAll('strong')[7]?.innerText
            const fujin_rank_name_4 = document.querySelectorAll('strong')[8]?.innerText
            const fujin_rank_name_5 = document.querySelectorAll('strong')[9]?.innerText
            
            const fujin_rank_lv_1 = (document.querySelectorAll('div.alert.text-white.py-2>span')[5] as HTMLElement)?.innerText
            const fujin_rank_lv_2 = (document.querySelectorAll('div.alert.text-white.py-2>span')[6] as HTMLElement)?.innerText
            const fujin_rank_lv_3 = (document.querySelectorAll('div.alert.text-white.py-2>span')[7] as HTMLElement)?.innerText
            const fujin_rank_lv_4 = (document.querySelectorAll('div.alert.text-white.py-2>span')[8] as HTMLElement)?.innerText
            const fujin_rank_lv_5 = (document.querySelectorAll('div.alert.text-white.py-2>span')[9] as HTMLElement)?.innerText


            return {
                chart,
                labels,
                avatar,
                name,
                lv,
                job,
                server,
                rankInKOnJob,
                rankInK,
                rankInROnJob,
                rankInR,
                legion_rank,
                legion_lv,
                legion_power,
                legion_bi,
                chengjiuzhi,
                avg_exp_7,
                avg_exp_14,
                total_exp_7,
                total_exp_14,
                fujin_job_rank_name_1,
                fujin_job_rank_name_2,
                fujin_job_rank_name_3,
                fujin_job_rank_name_4,
                fujin_job_rank_name_5,
                fujin_job_rank_lv_1,
                fujin_job_rank_lv_2,
                fujin_job_rank_lv_3,
                fujin_job_rank_lv_4,
                fujin_job_rank_lv_5,
                fujin_rank_name_1,
                fujin_rank_name_2,
                fujin_rank_name_3,
                fujin_rank_name_4,
                fujin_rank_name_5,
                fujin_rank_lv_1,
                fujin_rank_lv_2,
                fujin_rank_lv_3,
                fujin_rank_lv_4,
                fujin_rank_lv_5,
            }
        })

        return characterData
}




async function generateCharacterImage(page: Page, characterData: characterData, cfg: Config) {
    
    // let page = await browser.newPage()
    let labels

    // 判断不是主号，没有联盟信息的情况
    let visibility1 = characterData.legion_bi ? 'visibility':'hidden'
    let visibility2 = characterData.fujin_job_rank_name_1 ? 'visibility':'hidden'
    let visibility3 = characterData.fujin_rank_name_1 ? 'visibility':'hidden'
    let visibility4 = characterData.rankInK ? 'visibility':'hidden'
    let visibility5 = characterData.chart ? 'visibility':'hidden'
    let chart_unit
    let labelsHTML1 = ''
    let labelsHTML2 = ''
    let labelsHTML3 = ''
    // 生成图表单位部分
    let chartUnitsHTML1 = ''
    let chartUnitsHTML2 = ''
    let chartUnitsHTML3 = ''
    if(visibility5 == 'visibility') {
        labels = characterData.labels.map(item => `'${item}'`);
        if(labels) labels = labels.join(', ')
        chart_unit = characterData.chart.map(e => {

            return 999 < e && e < 1e6
                                ? Number((e / 1e3).toFixed(1)) + "K"
                                : 1e6 <= e && e < 1e9
                                ? Number((e / 1e6).toFixed(2)) + "M"
                                : 1e9 <= e && e < 1e12
                                ? Number((e / 1e9).toFixed(2)) + "B"
                                : 1e12 <= e && e < 1e15
                                ? Number((e / 1e12).toFixed(2)) + "T"
                                : "" + e;
            
                
            })


            if (characterData.labels) {
                for (let i = 0; i < 5; i++) {
                    const label = characterData.labels[i] || ''; // 如果不存在则使用空字符串
                    labelsHTML1 += `<p>${label}:</p>`
                }
                for (let i = 5; i < 10; i++) {
                    const label = characterData.labels[i] || ''; // 如果不存在则使用空字符串
                    labelsHTML2 += `<p>${label}:</p>`
                }
                for (let i = 10; i <= 13; i++) {
                    const label = characterData.labels[i] || ''; // 如果不存在则使用空字符串
                    labelsHTML3 += `<p>${label}:</p>`
                }
            }


            if (chart_unit) {
                for (let i = 0; i < 5; i++) {
                    const unit = chart_unit[i] || ''; // 如果不存在则使用空字符串
                    chartUnitsHTML1 += `<p>${unit}</p>`;
                }
                for (let i = 5; i < 10; i++) {
                    const unit = chart_unit[i] || ''; // 如果不存在则使用空字符串
                    chartUnitsHTML2 += `<p>${unit}</p>`;
                }
                for (let i = 10; i < 14; i++) {
                    const unit = chart_unit[i] || ''; // 如果不存在则使用空字符串
                    chartUnitsHTML3 += `<p>${unit}</p>`;
                }
            }






    }
    

    

    
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    </head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
    href="https://fonts.googleapis.com/css2?family=Jersey+15&family=Noto+Sans+SC:wght@100..900&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap"
    rel="stylesheet"
    />
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>

    <style>
    body {
    /* font-family: "Roboto", sans-serif; */
    color: #e7e7e7;
    }

    p {
    margin: 6px 0;
    /* 设置段落的上下外边距为 10px，左右外边距为 0 */
    }
    /* canvas#myChart {
    width: 650px !important;
    height: 320px !important;
    background-color: #222222;
    } */

    .content {
    display: flex;
    flex-wrap: wrap;
    /* flex-direction: column; */
    /* align-items: auto; */
    width: 1242px;
    height: 662px;
    background-color: #3b3b3b;
    padding-top: 15px;
    padding-left: 20px;
    font-family: "Noto Sans SC", sans-serif;
    font-optical-sizing: auto;
    font-weight: 300;
    font-style: normal;
    /* position: relative; */
    }

    .left {
    width: 217px;
    height: 662px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    gap: 6px;
    }

    .mid {
    width: 650px;
    height: 662px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    margin-left: 15px;
    gap: 6px;
    }

    .right {
    width: 325px;
    height: 662px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    margin-left: 15px;
    gap: 6px;
    }

    .ba {
    background-color: #222222;
    }

    .hui {
    background-color: #292929;
    }

    .name {
    width: 217px;
    height: 30px;
    text-align: center;
    line-height: 30px;
    }

    .juese {
    width: 217px;
    height: 392px;
    text-align: center;
    }

    .lianmeng {
    width: 217px;
    height: 30px;
    text-align: center;
    }

    .meiri {
    width: 650px;
    height: 30px;
    text-align: center;
    }

    .tubiao {
    width: 650px;
    height: 320px;
    }

    .tubiao > img {
    width: 100%;
    height: 100%;
    }

    .jingyan {
    width: 650px;
    height: 66px;
    display: flex;
    gap: 5px;
    }

    .jingyan1 {
    width: 322px;
    height: 58px;
    }
    .jingyan1 > div {
        visibility: ${visibility5};
    }

    .jingyan2 {
    width: 323px;
    height: 58px;
    }

    .jingyan2 > div {
        visibility: ${visibility5};
    }

    .biaoti {
    width: 650px;
    height: 30px;
    line-height: 30px;
    text-align: center;
    }

    .xiangqing {
    width: 650px;
    height: 176px;
    display: flex;
    gap: 5px;
    }

    .xiangqing1 {
    width: 213px;
    height: 176px;
    }

    .xiangqing1 > div {
        visibility: ${visibility5};
      }

    .xiangqing3 {
    width: 214px;
    height: 176px;
    }

    .xiangqing3 > div {
        visibility: ${visibility5};
      }

    .biaoti2 {
    width: 100%;
    height: 30px;
    line-height: 30px;
    text-align: center;
    }

    .paiming1 {
    width: 100%;
    height: 20px;
    }

    .paiming2 {
    width: 315px;
    height: 263px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 20px;
    padding-left: 10px;
    visibility: ${visibility2};
    }

    .paiming3 {
        width: 315px;
        height: 263px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-top: 20px;
        padding-left: 10px;
        visibility: ${visibility3};
    }

    .rank {
    width: 305px;
    height: 40px;
    display: flex;
    background-color: #313131;
    }
    .rank p {
    white-space: nowrap; /* 防止文本换行 */
    overflow: hidden; /* 隐藏溢出的文本 */
    text-overflow: ellipsis; /* 使用省略号显示溢出的文本 */
    }

    .yuce {
    height: 270px;
    background-color: azure;
    }

    .lianmengxq {
    width: 217px;
    height: 177px;
    visibility: ${visibility1};
    }

    .pv {
        visibility: ${visibility4};
    }
    </style>

    <body>
    <div class="content" id="app">
    <div class="left">
        <div class="hui jueshang name">${characterData.name}</div>
        <div class="ba juese">
        <div style="margin-top: 25px">
            <img
            src="${characterData.avatar}"
            style="margin-bottom: 22px; transform: scale(1.5)"
            />
            <p>${characterData.lv}</p>
            <p>${characterData.job}</p>
            <p>${characterData.server}</p>
            <div
            style="
                width: 180px;
                height: 106px;
                margin-left: 20px;
                display: flex;
                flex-direction: column;
            "
            >
            <p>
                <span style="float: left">区职业排名</span>
                <span style="float: right">${characterData.rankInKOnJob}</span>
            </p>
            <p class="pv">
                <span style="float: left">服务器职业排名</span>
                <span style="float: right">${characterData.rankInROnJob}</span>
            </p>
            <p class="pv">
                <span style="float: left">区总排名</span>
                <span style="float: right">${characterData.rankInK}</span>
            </p>
            <p class="pv">
                <span style="float: left">服务器总排名</span>
                <span style="float: right">${characterData.rankInR}</span>
            </p>
            </div>
        </div>
        </div>
        <div class="hui lianmeng">联盟</div>
        <div class="ba lianmengxq">
        <div
            style="
            margin-top: 1px;
            margin-left: 20px;
            width: 180px;
            display: flex;
            flex-direction: column;
            "
        >
        <p>
            <span style="float: left">联盟等级</span>
            <span style="float: right">${characterData.legion_lv}</span>
        </p>
        <p>
            <span style="float: left">联盟战斗力</span>
            <span style="float: right">${characterData.legion_power}</span>
        </p>
        <p>
            <span style="float: left">联盟排名</span>
            <span style="float: right">${characterData.legion_rank}</span>
        </p>
        <p>
            <span style="float: left">每日联盟币</span>
            <span style="float: right">${characterData.legion_bi}</span>
        </p>
            <p>
            <span style="float: left">成就值</span>
            <span style="float: right">${characterData.chengjiuzhi}</span>
            </p>
        </div>
        </div>
    </div>
    <div class="mid">
        <div class="hui meiri">每日经验获取</div>
        <div class="ba tubiao">
        <!-- <image src="./1.png"alt=""> -->
        <div style="margin-left: 26px; margin-top: 12px; width: 600px">
            <canvas id="myChart"></canvas>
        </div>
        </div>
        <div class="hui jingyan">
        <div class="ba jingyan1">
            <div style="margin-left: 20px; height: 100%; display: flex">
            <div style="width: 150px">
                <p>7日总经验</p>
                <p>7日日均经验</p>
            </div>
            <div style="width: 130px; text-align: right">
                <p>${characterData.total_exp_7}</p>
                <p>${characterData.avg_exp_7}</p>
            </div>
            </div>
        </div>
        <div class="ba jingyan2" style="margin-left: 1px">
            <div style="margin-left: 20px; height: 100%; display: flex">
            <div style="width: 150px">
                <p>14日总经验</p>
                <p>14日日均经验</p>
            </div>
            <div style="width: 130px; text-align: right">
                <p>${characterData.total_exp_14}</p>
                <p>${characterData.avg_exp_14}</p>
            </div>
            </div>
        </div>
        </div>
        <div class="hui biaoti">详情每日获取经验量</div>
        <div class="xiangqing">
        <div class="ba xiangqing1">
            <div
            style="
                height: 100%;
                margin-top: 15px;
                margin-left: 36px;
                display: flex;
                gap: 40px;
            "
            >
            <div style="width: 50px">
                ${labelsHTML1}
            </div>
            <div style="width: 48px; text-align: right">
                ${chartUnitsHTML1}
            </div>
            </div>
        </div>
        <div class="ba xiangqing1">
            <div
            style="
                height: 100%;
                margin-top: 15px;
                margin-left: 36px;
                display: flex;
                gap: 40px;
            "
            >
            <div style="width: 50px">
            ${labelsHTML2}
            </div>
            <div style="width: 48px; text-align: right">
            ${chartUnitsHTML2}
            </div>
            </div>
        </div>
        <div class="ba xiangqing3">
            <div
            style="
                height: 100%;
                margin-top: 15px;
                margin-left: 36px;
                display: flex;
                gap: 40px;
            "
            >
            <div style="width: 50px">
            ${labelsHTML3}
            </div>
            <div style="width: 48px; text-align: right">
            ${chartUnitsHTML3}
            </div>
            </div>
        </div>
        </div>
    </div>
    <div class="right">
        <div class="hui biaoti2">Reboot Kronos 附近职业排名</div>
        <!-- <div class="ba paiming1" style="background-color: tomato;"></div> -->
        <div class="ba paiming2">
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_job_rank_name_1}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_job_rank_lv_1}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_job_rank_name_2}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_job_rank_lv_2}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_job_rank_name_3}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_job_rank_lv_3}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_job_rank_name_4}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_job_rank_lv_4}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_job_rank_name_5}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_job_rank_lv_5}</p>
            </div>
        </div>
        </div>
        <div class="hui biaoti2">Reboot Kronos 附近总排名</div>
        <div class="ba paiming3">
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_rank_name_1}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_rank_lv_1}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_rank_name_2}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_rank_lv_2}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_rank_name_3}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_rank_lv_3}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_rank_name_4}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_rank_lv_4}</p>
            </div>
        </div>
        <div class="rank">
            <div style="height: 100%; width: 140px; margin-left: 16px">
            <p>${characterData.fujin_rank_name_5}</p>
            </div>
            <div style="height: 100%; width: 130px; text-align: right">
            <p>${characterData.fujin_rank_lv_5}</p>
            </div>
        </div>
        </div>
    </div>
    </div>
    </body>
    </html>
    <script>
    if('${visibility5}' === 'visibility'){
    // 获取 Canvas 元素
    const canvas = document.getElementById("myChart");
    // 获取 Canvas 的 2D 绘图上下文
    const ctx = canvas.getContext("2d");
    Chart.register(ChartDataLabels);
    // 创建图表实例并配置参数
    const myChart = new Chart(ctx, {
    type: "bar",

    data: {
    labels: [${labels}],
    datasets: [
        {
        label: "Exp",
        data: [${characterData.chart}],
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        },
    ],
    },
    options: {
    animation: false,    
    scales: {
        y: {
        ticks: {
            beginAtZero: true,
            callback: function (e, idx, values) {
            return 999 < e && e < 1e6
                ? Number((e / 1e3).toFixed(1)) + "K"
                : 1e6 <= e && e < 1e9
                ? Number((e / 1e6).toFixed(2)) + "M"
                : 1e9 <= e && e < 1e12
                ? Number((e / 1e9).toFixed(2)) + "B"
                : 1e12 <= e && e < 1e15
                ? Number((e / 1e12).toFixed(2)) + "T"
                : "" + e;
            },
        },
        },
    },
    //   interaction: {
    //     intersect: false,
    //     mode: "index",
    //   },
    plugins: {
        datalabels: {
        anchor: "end",
        align: "top",
        offset: -2,
        formatter: function (e, context) {
            return 999 < e && e < 1e6
            ? Number((e / 1e3).toFixed(1)) + "K"
            : 1e6 <= e && e < 1e9
            ? Number((e / 1e6).toFixed(2)) + "M"
            : 1e9 <= e && e < 1e12
            ? Number((e / 1e9).toFixed(2)) + "B"
            : 1e12 <= e && e < 1e15
            ? Number((e / 1e12).toFixed(2)) + "T"
            : "" + e;
        },
        },
        legend: {
        display: false,
        },
        tooltip: {
        callbacks: {
            label: function (ctx) {
            e = ctx.raw;
            return 999 < e && e < 1e6
                ? Number((e / 1e3).toFixed(1)) + "K"
                : 1e6 <= e && e < 1e9
                ? Number((e / 1e6).toFixed(2)) + "M"
                : 1e9 <= e && e < 1e12
                ? Number((e / 1e9).toFixed(2)) + "B"
                : 1e12 <= e && e < 1e15
                ? Number((e / 1e12).toFixed(2)) + "T"
                : "" + e;
            },
        },
        },
    },
    },
    });
}
    </script>

    `

    await page.setContent(htmlContent)

    let imageBuffer = await (await page.$('#app')).screenshot({})

    return imageBuffer

}

async function bindGms(ctx: Context, name: string, userId: string) {


    const url = `https://api.maplestory.gg/v2/public/character/gms/${name}`

    try {
        await ctx.http.get(url)
    } catch (error) {
        return '角色不存在'
    }

    try {
        await ctx.database.upsert('gmsInfo', [
            {
                userId: userId,
                name: name,
            }
        ], 'userId')
    } catch (error) {
        return '绑定失败'
    }
    return '绑定成功'
}

  async function saveImageToFile(arrayBuffer: string, filename: string) {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(filename);
      fileStream.write(Buffer.from(arrayBuffer));
      fileStream.end();
      fileStream.on('finish', () => {
        logger.info(`Image saved to ${filename}`);
        resolve(fileStream); 
      });
      fileStream.on('error', (error) => {
        reject(error);
      });
    });
  }