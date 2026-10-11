// Screening items. `domain` groups answers in the result view.
// `reverse: true` means a HIGHER frequency is the healthier answer.
// NOTE: wording is our own and should be reviewed against the questionnaire
// used by the NGO / clinical team before real-world use.
const OPTIONS = ["Never", "Rarely", "Sometimes", "Often", "Always"]; // values 0..4

const QUESTIONS = [
  { id: "q1",  domain: "Social", reverse: true,
    text: "When you smile or wave, does your child respond?",
    help: "For example by smiling or waving back." },
  { id: "q2",  domain: "Social", reverse: true,
    text: "Does your child look at your eyes when you talk or play together?" },
  { id: "q3",  domain: "Social", reverse: true,
    text: "Does your child point to show you something interesting?",
    help: "Not just to ask for something." },
  { id: "q4",  domain: "Communication", reverse: true,
    text: "Does your child respond when you call their name?" },
  { id: "q5",  domain: "Communication", reverse: true,
    text: "Does your child copy what you do, like clapping or making faces?" },
  { id: "q6",  domain: "Communication", reverse: false,
    text: "Does your child repeat the same words or phrases over and over?",
    help: "Without using them to talk about the moment." },
  { id: "q7",  domain: "Behaviour", reverse: false,
    text: "Does your child line up toys or spin objects for long periods?" },
  { id: "q8",  domain: "Behaviour", reverse: false,
    text: "Does your child get very upset by small changes in routine?" },
  { id: "q9",  domain: "Behaviour", reverse: false,
    text: "Does your child react strongly to sounds, lights or textures?",
    help: "For example covering ears or refusing certain clothes." },
  { id: "q10", domain: "Social", reverse: true,
    text: "Does your child play pretend games, like feeding a doll?" }
];
