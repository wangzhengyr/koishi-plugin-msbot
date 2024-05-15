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
      newDatav2: newDatav2,
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
    fujin_job_rank_name_lv: {
        name: string,
        lv: string
    }[],
    fujin_rank_name_lv: {
        name: string,
        lv: string
    }[]


}



export interface newDatav2 {
    id: number,
    category: string,
    featured: boolean,
    imageThumbnail: string,
    liveDate: Date,
    name: string,
    summary: string,
    nid: number,
    isNew?: boolean,
    imgbase64?: string,
    isOverHight?: boolean
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



    ctx.model.extend('newDatav2', {
        id: 'unsigned',
        category: 'string',
        featured: 'boolean',
        imageThumbnail: 'string',
        liveDate: 'date',
        name: 'string',
        summary: 'string',
        isNew: 'boolean',
        imgbase64: 'text',
        isOverHight: 'boolean'
    }, {
        primary: 'id',
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
    // let regex = new RegExp(".*" + key + ".*"); 
    let regex = new RegExp(key); 
    return ctx.database.get('questions', { 
        question: { $regex: regex },
    })
}

export async function getAnswerBykey(key: string, ctx: Context): Promise<Question[]> {
    // let regex = new RegExp(".*" + key + ".*")
    let regex = new RegExp(key)
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
        

        await delFileByAnswer(answer.answer)



        await ctx.database.remove('answers', { 
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



export async function getLastNewsV2(data: newDatav2, ctx: Context) {
    let newDatas = await ctx.database.get('newDatav2',{
        isNew: true,
        id: data.id
    })

    // 说明是新的
    if(newDatas.length === 0) {

        let oldNews = await ctx.database.get('newDatav2', {
            isNew: true
        })

        if(oldNews && oldNews.length > 0) {
            let oldNew = oldNews[0]
            oldNew.isNew = false

            if(oldNew.category === data.category) {
                await ctx.database.remove('newDatav2', {
                    id: oldNew.id
                })
            }else {
                await ctx.database.set('newDatav2', {
                    id: oldNew.id
                }, {
                    isNew: false
                })
                await ctx.database.remove('newDatav2', {
                    id: {$ne : oldNew.id},
                    category: oldNew.category
                })
                await ctx.database.remove('newDatav2', {
                    category: data.category
                })
            }

        }

        let news = await ctx.database.get('newDatav2', {
            id: data.id
        })

        if(news && news.length > 0) {
            await ctx.database.set('newDatav2', {
                id: data.id
            }, {
                isNew: true
            })
            return 2
        }


        data.isNew = true
        await ctx.database.create('newDatav2', data)
        return 1
    }
    return 0
}





export function delFileByAnswer(answer: string) {
    // 使用正则表达式匹配文件路径
    const filePathRegex = /file:\/\/(.+?)(?=")/g;
    const matches = answer.match(filePathRegex)
    if (matches) {
        // 创建一个 Promise 数组，用于保存每个删除操作的结果
        const promises = matches.map(match => {
            const filePath = match.replace("file://", "");
            // 返回一个 Promise，表示删除文件的异步操作
            return new Promise((resolve, reject) => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`删除文件 ${filePath} 失败:`, err)
                        resolve(false); // 删除失败时，将结果设置为 false
                    } else {
                        console.log(`文件 ${filePath} 删除成功`);
                        resolve(true); // 删除成功时，将结果设置为 true
                    }
                });
            });
        });

        // 使用 Promise.all 等待所有删除操作完成
        return Promise.all(promises).then(results => {
            // 如果所有文件都删除成功，则返回 true，否则返回 false
            return results.every(result => result === true);
        }).catch(err => {
            console.error("删除文件出错:", err);
            return false;
        });
    }

    return Promise.resolve(false); // 没有匹配到文件路径时，直接返回 false
}