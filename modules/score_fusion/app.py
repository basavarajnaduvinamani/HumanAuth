from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/submit", methods=["POST"])
def submit():
    try:
        scores = [
            float(request.form.get("liveness_score", 0)),
            float(request.form.get("biometric_score", 0)),
            float(request.form.get("document_score", 0)),
        ]
        avg_score = sum(scores) / len(scores)
        passed = avg_score >= 0.66
        result = f"{'✅' if passed else '❌'} Authentication {'Passed' if passed else 'Failed'} (Score: {avg_score:.2f})"
        return render_template("index.html", result=result, passed=passed)
    except Exception as e:
        return render_template("index.html", result="Error: Invalid input.", passed=False)

if __name__ == "__main__":
    app.run(debug=True)
