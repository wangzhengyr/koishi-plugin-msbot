import { Context, Logger, h } from 'koishi'
import { v4 as uuidv4 } from 'uuid';
import { getQuestionByquestion,getQAndAByQestion, addQuestion, buildAnswer, buildQuestion, addQestuinAndAnswer, getQuestionsByAnswerId, getQuestionsByKey, getAnswerBykey, delQestionsByQuestion} from './model';



// 整体导出对象形式的插件
export interface Config {}

export const name = 'Core'

const logger = new Logger("core");



export default function apply(ctx: Context, config: Config) {



    ctx.server.post('/mvp', async (c, next) => {
        let url =  c.request.body.url
        ctx.broadcast(['onebot:585681900'], h.image(url))
        
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

    ctx.command('test')
    .action(async ({session}) => {
        let qa = await getQAndAByQestion("你好", ctx)
        logger.info(qa)
    
        if(!qa) {
            return '没有找到词条内容'
        }
        return qa.answer
    })
}

