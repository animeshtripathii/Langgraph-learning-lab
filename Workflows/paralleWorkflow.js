// This is a workflow in whoich we learn how to make paraler workflow in langgraph.
// so we start from start node then it has three edges one is responsible to calulate the strike rate,other is responsible to create boundary percentage amd third one is responible to calculate balls per boundaryafter that all three outputs is connected to a nose summary and summart is connected to end

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

const batsmenState=Annotation.Root({
    runs:Annotation,
    balls:Annotation,
    fours:Annotation,
    sixes:Annotation,
    sr:Annotation,
    bpb:Annotation,
    boundary_percent:Annotation,
    summary:Annotation
})

async function calculate_sr(state){
    const balls=state.balls;
    const runs=state.runs;
    const sr=(runs/balls)*100;
    return {sr:sr};
}

async function calculate_bpb(state){
    const balls=state.balls;
    const sixes=state.sixes;
    const fours=state.fours;
    const bpb=balls/(fours+sixes);
    return {bpb:bpb};
}

async function calculate_boundary_percent(state){
    const runs=state.runs;
    const boundary_runs=(state.fours*4)+(state.sixes*6);
    const boundary_percent=(boundary_runs/runs)*100;
    return {boundary_percent:boundary_percent};
}

async function summaryy(state){
  const summary=`
  Strike rate:- ${state.sr}\n
  Bounday-per-ball:- ${state.bpb}\n
  Boundary_Percentage:- ${state.boundary_percent}
  `
   return {summary:summary};
}
const graph=new StateGraph(batsmenState)

graph.addNode("calculate_sr",calculate_sr)
graph.addNode("calculate_bpb",calculate_bpb)
graph.addNode("calculate_boundary-percent",calculate_boundary_percent)
graph.addNode("summaryy",summaryy)


graph.addEdge(START,"calculate_sr")
graph.addEdge(START,"calculate_bpb")
graph.addEdge(START,"calculate_boundary-percent")

graph.addEdge("calculate_sr","summaryy")
graph.addEdge("calculate_bpb","summaryy")
graph.addEdge("calculate_boundary-percent","summaryy")

graph.addEdge("summaryy",END);


const workflow=graph.compile()

const initial_State={
     runs:100,
    balls:50,
    fours:6,
    sixes:4
}
const ans=await workflow.invoke(initial_State);

console.log(ans);

