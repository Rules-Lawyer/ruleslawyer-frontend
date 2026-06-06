import Image from "next/image";
import ruleslawyerLogo from "@/public/TheRulesLawyer.png";
import Profile from "@/components/profile";

export default async function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start gap-8 p-8 pt-16 md:p-12 md:pt-12">
      <Image
        src={ruleslawyerLogo}
        width={500}
        height={436}
        alt="Rules Lawyer Logo"
        className="h-auto w-full max-w-[500px]"
      ></Image>

      <h1>The Rules Lawyer Convention and Library Management Platform</h1>

      <Profile />
    </main>
  );
}
