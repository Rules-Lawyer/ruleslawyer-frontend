import Image from "next/image";
import geekgayLogo from "@/public/geekgay.png";
import Profile from "@/components/ui/profile";

export default async function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start gap-8 p-8 pt-16 md:p-12 md:pt-12">
      <Image
        src={geekgayLogo}
        width={500}
        height={436}
        alt="Geekway to the West Pride Logo"
        className="h-auto w-full max-w-[500px]"
      ></Image>

      <Profile />
    </main>
  );
}
