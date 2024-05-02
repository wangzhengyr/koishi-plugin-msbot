import { Context, Logger } from 'koishi'
import  fs from 'fs' 

// 整体导出对象形式的插件
export interface Config {}

export const name = 'Model'

const logger = new Logger("model");

declare module 'koishi' {
    interface Tables {
      questions: Question
      answers: Answer,
      newData: newData,
      newMessage: newMessage,
      gmsInfo: gmsInfo
    }
}

export interface gmsInfo {
    userId: string,
    name: string
}

export interface characterData {
    chart: number[],
    labels: string[],
    avatar: string,
    name: string,
    lv: string,
    job: string,
    server: string,
    rankInKOnJob: string,
    rankInK: string,
    rankInROnJob: string,
    rankInR: string,
    legion_rank: string,
    legion_lv: string,
    legion_power: string,
    legion_bi: string,
    chengjiuzhi: string,
    avg_exp_7: string,
    avg_exp_14: string,
    total_exp_7: string,
    total_exp_14: string,
    fujin_job_rank_name_1: string,
    fujin_job_rank_name_2: string,
    fujin_job_rank_name_3: string,
    fujin_job_rank_name_4: string,
    fujin_job_rank_name_5: string,
    fujin_job_rank_lv_1: string,
    fujin_job_rank_lv_2: string,
    fujin_job_rank_lv_3: string,
    fujin_job_rank_lv_4: string,
    fujin_job_rank_lv_5: string,
    fujin_rank_name_1: string,
    fujin_rank_name_2: string,
    fujin_rank_name_3: string,
    fujin_rank_name_4: string,
    fujin_rank_name_5: string,
    fujin_rank_lv_1: string,
    fujin_rank_lv_2: string,
    fujin_rank_lv_3: string,
    fujin_rank_lv_4: string,
    fujin_rank_lv_5: string,

}


export interface newMessage extends newData{
    id?: number,
    imgbase64: string,
    isOverHight: boolean
}

export interface newData {
    id?: number,
    type: string,
    title: string,
    url: string,
    content: string
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


    ctx.model.extend('newData', {
        id: 'unsigned',
        type: 'string',
        title: 'string',
        url: 'string',
        content: 'text'
    }, {
        primary: 'id',
        autoInc: true,
    })

    ctx.model.extend('newMessage', {
        id: 'unsigned',
        type: 'string',
        title: 'string',
        url: 'string',
        content: 'text',
        imgbase64: 'text',
        isOverHight: 'boolean'
        
    }, {
        primary: 'id',
        autoInc: true,
    })

    ctx.model.extend('gmsInfo', {
        id: 'unsigned',
        userId: 'string',
        name: 'string',
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


    let res = answer.map(item => ({answer: item.answer.replace(/<[^>]*\/>/g, ""), id: item.id}))
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
        // 先删除图片
        let answer = await getAnswerById(answerId, ctx)
        

        // 使用正则表达式匹配文件路径
        const filePathRegex = /file:\/\/(.+?)(?=")/g;
        const matches = answer.answer.match(filePathRegex)
        if(matches) {
            for (const match of matches) {
                const filePath = match.replace("file://", "");
                // 删除文件
                fs.unlink(filePath, (err) => {
                  if (err) {
                    logger.info(`删除文件 ${filePath} 失败:`, err)
                  } else {
                    logger.info(`文件 ${filePath} 删除成功`)
                  }
                })
              }
        }



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


// newData相关sql
export function createNewData(data: newData, ctx: Context) {
    return ctx.database.create('newData', data)
}

export function getAllNewData(ctx: Context): Promise<newData[]> {
    return ctx.database.get('newData',{})
}

export function getAllNewMessage(ctx: Context): Promise<newMessage[]> {
    return ctx.database.get('newMessage',{})
}

export async function createNewMessage(datas: newMessage[], ctx: Context) {
    await ctx.database.remove('newMessage',{})
    return ctx.database.upsert('newMessage', (row) => datas)
}


export async function getLastNews(datas: newData[], ctx: Context) {

    let newDatas = await getAllNewData(ctx)
    

    const oldTitles = newDatas.map(item => item.url)


    let lastNews = datas.filter(item => !oldTitles.includes(item.url))


    await ctx.database.remove('newData',{})
    await ctx.database.upsert('newData', (row) => datas)

    
    return lastNews
}
