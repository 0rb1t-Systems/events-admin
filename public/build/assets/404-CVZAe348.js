import{e as o,r as s,s as i,f as r,j as e,d as n,g as l}from"./main-CFieH9A3.js";const d=()=>{const a=o();return s.useEffect(()=>{a(i("Page Not Found"))}),r(t=>t.themeConfig.theme==="dark"||t.themeConfig.isDarkMode),e.jsxs("div",{className:"relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800",children:[e.jsx("div",{className:"container mx-auto px-4",children:e.jsxs("div",{className:"relative z-10 flex flex-col items-center",children:[e.jsx("div",{className:"mb-8 flex items-center justify-center",children:e.jsxs("h1",{className:"animate-pulse text-[150px] font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 md:text-[200px]",children:["4",e.jsx("span",{className:"inline-block animate-bounce text-primary",children:"0"}),"4"]})}),e.jsx("div",{className:"absolute left-0 top-0 opacity-20",children:e.jsx("div",{className:"h-40 w-40 rounded-full bg-primary opacity-20"})}),e.jsx("div",{className:"absolute bottom-0 right-0 opacity-20",children:e.jsx("div",{className:"h-40 w-40 rounded-full bg-secondary opacity-20"})}),e.jsxs("div",{className:"text-center",children:[e.jsx("h2",{className:"mb-4 text-2xl font-bold text-gray-800 dark:text-white md:text-4xl",children:"Oops! Page Not Found"}),e.jsx("p",{className:"mb-8 text-center text-gray-600 dark:text-gray-300 md:text-lg",children:"The page you're looking for doesn't exist or has been moved."}),e.jsxs("div",{className:"flex flex-col items-center justify-center gap-3 sm:flex-row",children:[e.jsx("button",{onClick:()=>window.history.back(),className:"btn rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700",children:"Go Back"}),e.jsx(n,{to:l.getHomePage(),className:"btn btn-gradient rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 text-base font-medium text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800",children:"Back to Home"})]})]})]})}),e.jsx("div",{className:"float-animation absolute left-1/4 top-1/4 h-16 w-16 rounded-full bg-purple-200 opacity-30 dark:bg-purple-700"}),e.jsx("div",{className:"float-animation-delay absolute bottom-1/4 right-1/3 h-20 w-20 rounded-full bg-blue-200 opacity-30 dark:bg-blue-700"}),e.jsx("div",{className:"float-animation-slow absolute bottom-1/2 right-1/4 h-12 w-12 rounded-full bg-pink-200 opacity-30 dark:bg-pink-700"}),e.jsx("style",{children:`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }

                .float-animation {
                    animation: float 6s ease-in-out infinite;
                }

                .float-animation-delay {
                    animation: float 8s ease-in-out 1s infinite;
                }

                .float-animation-slow {
                    animation: float 10s ease-in-out 2s infinite;
                }
                `})]})},m=()=>e.jsx(d,{});export{m as default};
