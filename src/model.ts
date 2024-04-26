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

export interface QuestionDto extends Question {
    answer: string
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

export async function getQuestionByquestion(question: string, ctx: Context): Promise<Question> {
    let questions = await ctx.database.get('questions', { 
        question: question,
    })
    return questions[0]
}

export async function getAnswerById(id: number, ctx: Context): Promise<Answer> {
    // return ctx.database
    // .select('answers')
    // .where({ id: id})
    // .execute()
    let answer = await ctx.database.get('answers', { 
        id: id,
    })
    return answer[0]
}

export async function getQuestionsByKey(key: string, ctx: Context): Promise<Question[]> {
    let regex = new RegExp(".*" + key + ".*"); 
    return ctx.database.get('questions', { 
        question: { $regex: regex },
    })
}

export async function getAnswerBykey(key: string, ctx: Context): Promise<Question[]> {
    let regex = new RegExp(".*" + key + ".*"); 
    let answer = await ctx.database.get('answers', { 
        answer: { $regex: regex },
    })


    let res = answer.map(item => ({answer: item.answer.replace(/<img[^>]*>/g, ""), id: item.id}))
    .filter(item => item.answer.includes(key))
    let answerIds = res.map(item => item.id)
    return ctx.database.get('questions', {
        answerid: { $in: answerIds }
    })


}


export async function delQestionsByQuestion(q: string, answerId: number, userId: string, ctx: Context){


    let questions = await getQuestionsByAnswerId(answerId,ctx)
    // 如果没有其他问题指向这个答案，则还需要删除答案
    if(questions.length === 1) {
        ctx.database.remove('answers', { 
            id: answerId,
        })
    }

    return ctx.database.remove('questions', { 
        question: q,
        createdid: userId
    })

}


export async function getQAndAByQestion(q: string, ctx: Context): Promise<Answer | null> {
    let questions = await getQuestionByquestion(q, ctx)
    if(!questions) return null
    let aid = questions.answerid
    if(questions) {
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
    if(q) return null
    let aid = (await addAnswer(answer, ctx)).id
    question.answerid = aid
    return addQuestion(question, ctx)
}
export async function getQuestionsByAnswerId(answerId: number, ctx: Context) {
    return ctx.database.get('questions', { 
        answerid: answerId,
    })
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