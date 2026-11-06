# AI Food Systems

Three AI tools that make it easier to eat well on a tight budget. Built by Rayan Nakum, Economics graduate and Chef, as a public build.

See them on my portfolio: https://www.rayannakum.co.uk/#systems

## The problem
Eating well on a tight budget is hard. I lived it, so I built the tools I wish I had.

## System 1: Budget Meal Planner
Fill in a form with your budget, days, dietary needs and nearest supermarket. Get a personalised meal plan with costs, nutrition and a shopping list by email.

How it works: Google Form → Make.com → AI → Gmail

This one runs in Make.com, so there is no code in this repo.

Try it: https://bit.ly/rayeats-mealplanner

## System 2: Fridge to Recipe
Upload a photo of your fridge. The AI spots what you have and suggests three recipes using it.

How it works: Photo upload → Google Gemini → Recipe output

Code: `fridge-to-recipe/` and `api/fridge-analyze.js`

Try it: https://tools.rayannakum.co.uk/fridge-to-recipe

## System 3: Recipe Budget Scorer
Paste any recipe and get an A to F grade based on cost per serving, nutrition per pound spent and difficulty.

How it works: Recipe text or URL → Google Gemini → Score and grade

Code: `recipe-scorer.html` and `api/score.js`

Try it: https://tools.rayannakum.co.uk/recipe-scorer

## Moving from Claude to Gemini
I first built these on Claude. In November 2026 I moved them to Google Gemini's free tier so they stay free to run.

## How it is built
- Plain HTML, CSS and JavaScript
- Vercel serverless functions in `api/` call the AI, so the API key never reaches the browser
- The key is stored in Vercel as `GEMINI_API_KEY`
