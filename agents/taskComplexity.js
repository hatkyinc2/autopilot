const { callAgent } = require('../agents/genericAgent');
const { jsonParseWithValidate } = require('../modules/gpt');

const promptTemplate =
` 
USER INPUT: {task}
YOUR TASK: You are a project manager working in a software development project. Measure the complexity of doing the USER INPUT and decide if it's critical to breakdown the work into less complex JIRA tasks. Based on your assessment output the list of tasks. Tasks will be done by engineers
CONTEXT: 
\`\`\`
{summaries}
\`\`\`

You must respond in JSON format as described below

RESPONSE FORMAT:
{
    "thoughts":
    {
        "text": "thought",
        "reasoning": "reasoning",
        "criticism": "constructive self-criticism",
        "speak": "thoughts summary to say to user"
    },
    "output": {
        "taskList": [{
            "taskTitle": "Title of JIRA task",
            "taskDescription": "Description of JIRA task"
        }]
    }
}
Ensure the response can be parsed by JSON.parse in nodejs
`

async function taskComplexityAgent(summaries, task) {
    const values = {task:task, summaries:summaries}
    const reply = await callAgent(promptTemplate, values, process.env.CHEAP_MODEL);
    return jsonParseWithValidate(reply)
}

module.exports = taskComplexityAgent