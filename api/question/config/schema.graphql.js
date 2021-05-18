// module.exports = {
//     definition:`
//         type createQuestionsPayload{
//             output: [String]
//         }
//     `,
//     mutation: `
//         createQuestions(input: [QuestionInput]!): createQuestionsPayload
//     `,
//     resolver: {
//         Mutation: {
//             createQuestions: {
//                 description: 'Create Questions',
//                 resolverOf: 'application::question.question.create',
//                 resolver: async (obj, options, others) => {
//                     let questionsList = []
//                     if(options.input.length === 0) return [];
//                     else{
//                         for(option of options.input){
//                             let result = await strapi.services.question.create({
//                                 ...option
//                                 })
                                
//                             questionsList.push(result.id)
//                         }                        
//                     }
                    
//                 }
//             }
//         }
//     }
// }