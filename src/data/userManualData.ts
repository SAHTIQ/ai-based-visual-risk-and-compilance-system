export interface ManualModule {
  id: string;
  title: string;
  badge: string;
  summary: string;
  steps: string[];
  tips: string[];
  faqs?: { q: string; a: string }[];
}

export const USER_MANUAL_MODULES: ManualModule[] = [
  {
    id: "getting-started",
    title: "1. Getting Started & Authentication",
    badge: "Basics",
    summary: "Create your personal account, sign in securely, or use instant Google One-Click authentication.",
    steps: [
      "Navigate to the Login page or click 'Create an account' to register.",
      "Enter your Full Name, Email address, and a secure password (minimum 8 characters).",
      "Alternatively, click the 'Sign in with Google' button for instant, passwordless sign-in with your Google Account.",
      "For quick exploration in development mode, you can click 'Use demo account' to sign in instantly with sample data.",
      "Your session is maintained securely via HTTP-Only encrypted cookies for maximum security."
    ],
    tips: [
      "If you registered with Google, your account name and avatar are synced automatically.",
      "You can log out at any time by clicking your user avatar in the top right header and selecting 'Log Out'."
    ],
    faqs: [
      {
        q: "Is my password stored securely?",
        a: "Yes. Passwords are never stored in plain text. They are hashed using industry-standard bcrypt with adaptive cryptographic salt."
      }
    ]
  },
  {
    id: "profile-management",
    title: "2. Profile & Demographic Settings",
    badge: "Account",
    summary: "Personalize your details, academic qualifications, and demographic background to calibrate your analytics.",
    steps: [
      "Click on 'Profile' in the left sidebar or click 'My Profile' in the top right user menu.",
      "Click the 'Edit Profile' button in the top right of the page.",
      "Update your Full Name, Age, Gender, Occupation, Education level, Phone, Location, and Professional Bio.",
      "Click 'Save Changes' to update your record. Your initials, header greeting, and completeness score update immediately."
    ],
    tips: [
      "Maintaining a 100% Profile Completeness score improves baseline calibration for what-if simulations.",
      "Your email address is your unique system identifier and is locked to your account credentials."
    ]
  },
  {
    id: "dashboard-overview",
    title: "3. Dashboard & KPI Overview",
    badge: "Core Feature",
    summary: "Your central cockpit for tracking overall productivity, financial health, study hours, and habit consistency.",
    steps: [
      "Click 'Dashboard' in the left navigation sidebar.",
      "Inspect the top KPI Summary Cards: Productivity Score, Monthly Savings, Expense Breakdown, and Study vs Focus Hours.",
      "Review the interactive line charts showing your daily and weekly performance curves.",
      "Check the '30-Day Outlook' indicator in the lower left corner to see if enough records exist for what-if simulations."
    ],
    tips: [
      "Use the date picker in the top header to inspect performance records on any past calendar day.",
      "Hover over chart points to inspect exact numeric values and dates."
    ]
  },
  {
    id: "productivity-tracking",
    title: "4. Productivity & Behavior Analysis",
    badge: "Tracking",
    summary: "Record deep work sessions, distinguish focus from distractions, and analyze behavioral patterns.",
    steps: [
      "Click 'Productivity & Behavior' in the sidebar.",
      "Review your logged work sessions broken down by Coding, Study, Project, or Reading.",
      "Compare Focus Hours against Distraction Hours to assess your deep work efficiency ratio.",
      "View the behavioral activity heatmap to identify your peak performance days of the week."
    ],
    tips: [
      "A healthy focus-to-distraction ratio is above 4:1 (over 80% focus).",
      "Regular daily logging ensures accurate machine-learning forecasts for the upcoming week."
    ]
  },
  {
    id: "predictive-forecasting",
    title: "5. Predictive Forecasting (Machine Learning)",
    badge: "ML Powered",
    summary: "Generate evidence-grounded machine-learning predictions for future productivity, expenses, and habits.",
    steps: [
      "Click 'Predictive Forecasting' in the sidebar.",
      "Select the metric tab you want to forecast: Productivity Score, Weekly Expenses, or Habit Consistency.",
      "Switch between Daily and Weekly time aggregations.",
      "Inspect the prediction chart: the solid line shows historical actuals, while the highlighted region represents model predictions.",
      "Read the 'Evidence & Methodology' box: it explains the exact scikit-learn model, R² score, and historical observations used."
    ],
    tips: [
      "If the screen shows 'Insufficient Observations', log at least 3 historical records to allow the model to build a reliable feature vector.",
      "The system will never fabricate random predictions when real data is insufficient."
    ]
  },
  {
    id: "future-simulation",
    title: "6. Future Simulation & What-If Planner",
    badge: "Advanced",
    summary: "Test hypothetical lifestyle adjustments and project their compound impact over 30, 90, 180, or 365 days.",
    steps: [
      "Click 'Future Simulation' in the sidebar.",
      "Review 'Where You Stand Today': this displays your current historical baseline (average spending, sleep, study hours).",
      "Adjust the What-If Sliders: Study Load (hrs/week), Sleep (hrs/night), Monthly Spending ($), and Exercise Frequency (days/week).",
      "Select your planning horizon: 30 Days, 90 Days, 180 Days, or 365 Days.",
      "Review the 3 generated scenarios: Optimistic (Best Case), Expected Scenario, and Risk Scenario.",
      "Inspect the Sensitivity Analysis ranking to see which single lifestyle change provides the highest positive leverage.",
      "Check the 'Rule Trace' alerts: automatically flags burnout risks, sleep deprivation, or emergency savings shortfalls."
    ],
    tips: [
      "Click 'Save Simulation' to store your scenario snapshot into your personal history for future comparison.",
      "Use the AI Explanation tab to receive a plain-language summary of what your simulation numbers mean."
    ]
  },
  {
    id: "ai-assistant",
    title: "7. Context-Aware AI Assistant",
    badge: "AI Chat",
    summary: "Ask questions, uncover patterns, and receive personalized advice grounded directly in your application data.",
    steps: [
      "Click 'AI Assistant' in the sidebar.",
      "Type a question in the prompt box (e.g., 'What habits are helping my productivity?', 'Explain my latest simulation').",
      "Or click any of the pre-built suggestion chips at the top.",
      "The AI Assistant retrieves your records, builds an evidence context, and streams the answer token-by-token.",
      "Look for interactive evidence cards beneath assistant messages for quick metric verification.",
      "Use the left chat drawer to start new conversations, switch between existing threads, or pin important discussions."
    ],
    tips: [
      "The AI Assistant uses strict tenant isolation: it only reads your own records and cannot see other users' data.",
      "If the external LLM provider is busy, the assistant displays a polite status message without losing your chat history."
    ]
  },
  {
    id: "records-management",
    title: "8. Records Management (Finance, Study & Habits)",
    badge: "Data Entry",
    summary: "Log your daily activities across three core personal domains.",
    steps: [
      "**Financial**: Add income, expense transactions, category tags, and monthly budget targets.",
      "**Study**: Record course subjects, hours studied, goal hours, and academic exam performance percentages.",
      "**Habits**: Check off daily completed habits, specify duration in minutes, and track consecutive streaks.",
      "All logged records instantly update your dashboard analytics, forecast models, and simulation baselines."
    ],
    tips: [
      "Deleting a record automatically recalibrates your statistics and activity audit trail."
    ]
  },
  {
    id: "activity-and-settings",
    title: "9. Activity History & Theme Customization",
    badge: "System",
    summary: "Audit your account activity and personalize application appearance.",
    steps: [
      "Click 'Activity History' to inspect an immutable audit timeline of registrations, logins, record creations, and edits.",
      "Click 'Settings' to customize your preferred theme (Dark Mode, Light Mode, or System Default).",
      "You can also quickly toggle the theme using the Sun/Moon icon in the top header bar.",
      "Change notification preferences and data display options."
    ],
    tips: [
      "Dark mode is optimized for nighttime reading and reduces eye fatigue during extended study sessions."
    ]
  }
];
