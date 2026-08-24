// simple sequential workflow of BMI calculation using LangGraph
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

const BMIState = Annotation.Root({
    heightM: Annotation,
    weightKg: Annotation,
    bmi: Annotation,
    category: Annotation,
    summary: Annotation,
});

class BMI {
    calculate(weightKg, heightM) {
        return Number((weightKg / (heightM * heightM)).toFixed(2));
    }

    category(bmi) {
        if (bmi < 18.5) return "Underweight";
        if (bmi < 25) return "Normal";
        if (bmi < 30) return "Overweight";
        return "Obese";
    }
}

const bmiService = new BMI();

const workflow = new StateGraph(BMIState)
    .addNode("calculate_bmi", (state) => {
        const bmi = bmiService.calculate(state.weightKg, state.heightM);
        return { ...state, bmi };
    })
    .addNode("classify_bmi", (state) => {
        const category = bmiService.category(state.bmi);
        return { ...state, category };
    })
    .addEdge(START, "calculate_bmi")
    .addEdge("calculate_bmi", "classify_bmi")
    .addEdge("classify_bmi", END);

const app = workflow.compile();

const result = await app.invoke({
    heightM: 1.75,
    weightKg: 84,
});

console.log(result);