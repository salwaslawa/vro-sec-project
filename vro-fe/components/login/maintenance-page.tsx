// "use client";

// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import { Hammer, RefreshCcw } from "lucide-react"; 

// export function MaintenanceForm() {
  
//   const handleRefresh = () => {
//     window.location.reload();
//   };

//   return (
//     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-4">
//       <div className="flex w-full max-w-md flex-col items-center text-center">
//         <div className="mb-8 flex items-center justify-center">
//           {/* <img
//             src="/images/schneider.png"
//             alt="Schneider Electric"
//             className="h-8 w-auto"
//           /> */}
//         </div>

//         <div className="mb-6 rounded-full bg-[#008A15]/10 p-6">
//           <Hammer className="h-12 w-12 text-[#008A15]" />
//         </div>

//         <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
//           We are currently under maintenance
//         </h1>
//         <p className="mb-8 text-muted-foreground">
//           We are working hard to improve the user experience. <br className="hidden sm:inline" />
//           Please check back in a little while.
//         </p>

//         <Button 
//           onClick={handleRefresh} 
//           className="gap-2 w-full sm:w-auto min-w-[200px]"
//         >
//           <RefreshCcw className="h-4 w-4" />
//           Refresh Page
//         </Button>

//         {}
//         <div className="mt-12 text-sm text-muted-foreground">
//           <p>Need access to other portals?</p>
//           <div className="mt-4 flex justify-center gap-4">
//             {/* <a
//               href="https://mvp-fe.vercel.app"
//               className="font-medium text-primary hover:underline"
//               target="_blank" 
//               rel="noreferrer"
//             >
//               MVP Portal
//             </a> */}
//             <span className="text-muted-foreground/50">•</span>
//             <a
//               href="http://72.61.210.181:3001"
//               className="font-medium  hover:underline text-[#008A15]"
//               target="_blank" 
//               rel="noreferrer"
//             >
//               Trisutorpro
//             </a>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }