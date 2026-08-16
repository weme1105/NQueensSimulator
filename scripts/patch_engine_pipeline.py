from pathlib import Path

path = Path('src/solver/engine.ts')
source = path.read_text(encoding='utf-8')
source = source.replace(
    "  nextStep(): DeductionResult | null {\n    return this.runPipeline(STEP_PIPELINE);\n  }",
    "  nextStep(): DeductionResult | null {\n    const bad = this.contradiction();\n    if (bad) throw new Error(`矛盾：${bad}`);\n    return this.runPipeline(STEP_PIPELINE);\n  }",
)
source = source.replace(
    "  nextAutoDeduction(): DeductionResult | null {\n    return this.runPipeline(AUTO_PIPELINE);\n  }",
    "  nextAutoDeduction(): DeductionResult | null {\n    const bad = this.contradiction();\n    if (bad) throw new Error(`矛盾：${bad}`);\n    return this.runPipeline(AUTO_PIPELINE);\n  }",
)
source = source.replace(
    "case 'hall-4-5-proof': return this.proof(5, 'hall-4-5-proof', 4);",
    "case 'hall-4-5-proof': return this.proof(5, 'hall-4-5-proof');",
)
path.write_text(source, encoding='utf-8')
