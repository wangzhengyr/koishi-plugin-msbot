import { Context, Logger } from 'koishi'
import { v4 as uuidv4 } from 'uuid';
import { getQuestionByquestion,getQAndAByQestion, addQuestion, buildAnswer, buildQuestion, addQestuinAndAnswer} from './model';
import { send } from 'process';

// 整体导出对象形式的插件
export interface Config {}

export const name = 'Core'

const logger = new Logger("core");



export default function apply(ctx: Context, config: Config) {

    ctx.command('学习 <q:string> <a:text>', 'q是问题，a是答案，中间空格隔开')
    .action(async ({session}, q, a) => {
        logger.info("问题是：" +q,"答案是："+  a)
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
            return "问题已存在"
        }else {
            return "添加成功"
        }
    })

    ctx.command('关联 <q1:string> <q2:string>', 'q1是新增的问题，q2是关联的旧问题')
    .action(async ({session}, q1, q2) => {
        q1 = q1.toLowerCase()
        q2 = q2.toLowerCase()
        let questions = await getQuestionByquestion(q1, ctx)
        let questions2 = await getQuestionByquestion(q2, ctx)
        if(questions != null && questions.length != 0) {
            return "新增问题已存在：" + q1
        }
        if(questions2 === null || questions2.length === 0) {
            return "关联问题不存在：" + q2
       }

       // 取出q2中的answerid字段并赋值给q1
       let question = buildQuestion(q1, questions2[0].answerid, 0, session.userId)
       await addQuestion(question, ctx)
       return "关联成功"

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
    //             return "问题已存在"
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
    
        if(!qa || qa.length < 1) {
            return next()
        }
        return qa[0].answer
    })

    ctx.command('test')
    .action(async ({session}) => {
        let qa = await getQAndAByQestion("你好", ctx)
        logger.info(qa)
    
        if(!qa || qa.length < 1) {
            return '没有找到答案'
        }
        return qa[0].answer
    })
}

