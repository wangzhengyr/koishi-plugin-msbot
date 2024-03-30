import { Context, Logger } from 'koishi'

// 整体导出对象形式的插件
export interface Config {}

export const name = 'Model'

const logger = new Logger("model");

declare module 'koishi' {
    interface Tables {
      questions: Question
      answers: Answer
    }
}
  

// 这里是新增表的接口类型
export interface Answer {
    id?: number
    answer: string
}



// 这里是新增表的接口类型
export interface Question {
    id?: number
    question: string,
    answerid: number,
    createdid: string,
    parentid: number
}
export default function apply(ctx: Context, config: Config) {
    logger.info('model加载成功')
    ctx.model.extend('questions', {
        // 各字段的类型声明
        id: 'unsigned',
        question: 'string',
        answerid: 'integer',
        createdid: 'string',
        parentid: 'integer'
    }, {
        primary: 'id',
        autoInc: true,
    })
    ctx.model.extend('answers', {
        // 各字段的类型声明
        id: 'unsigned',
        answer: 'text',
    }, {
        primary: 'id',
        autoInc: true,
    })
    

}

export async function getQuestionByquestion(question: string, ctx: Context) {
    return ctx.database.get('questions', { 
        question: question,
    })
}

export async function getAnswerById(id: number, ctx: Context) {
    return ctx.database
    .select('answers')
    .where({ id: id})
    .execute()
}


export async function getQAndAByQestion(q: string, ctx: Context) {
    let questions = await getQuestionByquestion(q, ctx)
    if(questions.length == 0) return null
    let aid = questions[0].answerid
    if(questions.length > 0) {
        return await getAnswerById(aid, ctx)
    }
    return null
}


export async function addQuestion(data: Question, ctx: Context) {
    return ctx.database.create('questions', data)
}

export async function addAnswer(data: Answer, ctx: Context) {
    return ctx.database.create('answers', data)
}

export async function addQestuinAndAnswer(answer: Answer, question: Question, ctx: Context) {
    // 判断是否有一样的问题
    let q = await getQuestionByquestion(question.question, ctx)
    if(q && q.length > 0) return null
    let aid = (await addAnswer(answer, ctx)).id
    question.answerid = aid
    return addQuestion(question, ctx)
}

export function buildQuestion(question: string, answerid: number, parentid = 0, createdid: string):Question {

    const q: Question = {
        question,
        answerid,
        parentid,
        createdid
    };
    return  q 
}

export function buildAnswer(answer: string):Answer {

    const a: Answer = {
        answer,

    };
    return  a
}