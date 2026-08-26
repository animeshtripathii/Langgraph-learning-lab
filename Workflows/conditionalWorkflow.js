// Conditional workflow without agents: calculate the discriminant of a
// quadratic equation (ax² + bx + c = 0), then choose the correct root path.
import { Annotation, START, StateGraph } from "@langchain/langgraph";

const State = Annotation.Root({
	a: Annotation(),
	b: Annotation(),
	c: Annotation(),
	equation: Annotation(),
	discriminant: Annotation(),
	result: Annotation(),
});

const showEquation = (state) => {
	const equation = `${state.a}x² ${state.b >= 0 ? "+" : "-"} ${Math.abs(
		state.b
	)}x ${state.c >= 0 ? "+" : "-"} ${Math.abs(state.c)} = 0`;

    console.log(equation);
	return { equation };
};

const calculateDiscriminant = (state) => ({
	discriminant: state.b ** 2 - 4 * state.a * state.c,
});

const chooseRootPath = (state) => {
	if (state.discriminant > 0) return "twoRoots";
	if (state.discriminant === 0) return "oneRoot";
	return "noRealRoots";
};

const twoRoots = (state) => {
	const squareRoot = Math.sqrt(state.discriminant);
	return {
		result: [
			(-state.b + squareRoot) / (2 * state.a),
			(-state.b - squareRoot) / (2 * state.a),
		],
	};
};

const oneRoot = (state) => ({
	result: [-state.b / (2 * state.a)],
});

const noRealRoots = () => ({
	result: "The equation has no real roots.",
});

const workflow = new StateGraph(State)
	.addNode("calculateDiscriminant", calculateDiscriminant)
	.addNode("twoRoots", twoRoots)
	.addNode("oneRoot", oneRoot)
	.addNode("noRealRoots", noRealRoots)
	.addEdge(START, "calculateDiscriminant")
	.addConditionalEdges("calculateDiscriminant", chooseRootPath)
	.addEdge("twoRoots", "__end__")
	.addEdge("oneRoot", "__end__")
	.addEdge("noRealRoots", "__end__")
	.compile();

const result = await workflow.invoke({ a: 1, b: -5, c: 6 });

console.log(result.result);


