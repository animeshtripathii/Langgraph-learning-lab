//this is basic agentic sequential workflow for hand on practice of node,edges and state in langGraph

import { configDotenv } from "dotenv";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
configDotenv();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY,
});



// const LLMstate = Annotation.Root({
//   question: Annotation,
//   answer: Annotation
// });

// async function llm_qa(state) {
//   const question = state.question;
//   const prompt = `Answer the following: ${question}`;
//   const response = await llm.invoke(prompt);
//   const ans = response.content;

//   return { answer: ans };
// }

// const graph = new StateGraph(LLMstate);

// graph.addNode("llm_qa", llm_qa);

// graph.addEdge(START,"llm_qa")
// graph.addEdge("llm_qa",END)

// const workflow=graph.compile();

// const intial_state={"question":"How far is moon from the earth?"}


// const ans=await workflow.invoke(intial_state);


// console.log(ans.answer);




//propmpt chaining Workflow for genrating blog  using outline given by llm

const blogState=Annotation.Root({
  title:Annotation,
  outline:Annotation,
  content:Annotation,
  evaluate:Annotation
})

const graph=new StateGraph(blogState)



async function blogOutline(state) {
  // fetch title of blog

  const title=state.title

  //generate outline
  const prompt=`Generate the outline for the blog whose title is ${title}`

  const ans=await llm.invoke(prompt)
  const outline=ans.content
return {outline:outline}
}


async function blog(state) {
  // fetch title of blog

  const title=state.title
  const outline=state.outline

  //generate outline
  const prompt=`Generate the blog  using  the blog title ${title} and  outline  ${outline}`

  const ans=await llm.invoke(prompt)
  const content=ans.content
return {content:content}
}

async function rating(state) {
  const title = state.title;
  const outline = state.outline;
  const blog = state.content;

  const prompt = `Here is the blog title: ${title}.\nI want you to rate this blog out of 10 based on how well it follows the outline below.\nBlog content:\n${blog}\n\nOutline:\n${outline}`;

  const response = await llm.invoke(prompt);
  const evaluation = response.content;

  return { evaluate: evaluation };
}


//nodes

graph.addNode("blogOutline",blogOutline)
.addNode("blog",blog)
.addNode("rating",rating)

// make edges

graph.addEdge(START,"blogOutline")
graph.addEdge("blogOutline","blog")
graph.addEdge("blog","rating")
graph.addEdge("rating",END)

const workflow=graph.compile();

const intial_state={"title":"AI agents using langgraph"};


const ans=await workflow.invoke(intial_state)

console.log("Outlines: - \n",ans.outline);

console.log("\n")
console.log("\n")

console.log("Blog: - \n",ans.content)

console.log("\n")
console.log("\n")


console.log("Rating:",ans.evaluate);