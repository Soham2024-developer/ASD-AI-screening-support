# ASD Early Screening Assistant – Frontend

Responsive, accessible web frontend for our ASD screening project.
Plain HTML / CSS / JavaScript, with no build step and no dependencies.

> **Disclaimer:** this is a student prototype for screening support only.
> It does not diagnose autism.

## Run
```bash
git clone <your-repo-url>
cd asd-screening-frontend
python -m http.server 8000     # then open http://localhost:8000
```
(or just double-click `index.html`)

## Structure
```
index.html          page + all 5 screens (home, child info, quiz, loading, result)
css/style.css       theme, light/dark, print styles
js/questions.js     the 10 screening questions (edit text / domains here)
js/api.js           model connection  <- model team edits only this file
js/app.js           screen flow, validation, result rendering
```

## Connecting the model
Set `API_URL` in `js/api.js`. The backend receives:
```json
{ "age_months": 30, "sex": "F", "language": "Hindi", "family_history": 0,
  "answers": { "q1": 3, "q2": 4, "...": 0 } }
```
and should return:
```json
{ "probability": 0.62,
  "domain_scores": { "Social": 0.7, "Communication": 0.5, "Behaviour": 0.6 } }
```
With `API_URL` empty (or unreachable) the app uses a placeholder scorer and
labels results as **demo mode**.
