import { auth0 } from "@/lib/auth0";
import React from "react";
import { SignOut } from "@/components/auth/signout-client";
import { SignIn } from "@/components/auth/signin";
import Image from "next/image";
import Link from "next/link";

export default async function Profile() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return <SignIn />;
  }

  return (
    <div className="flex justify-center items-center">
      <Image
        src={session.user.picture ?? ""}
        width={50}
        height={50}
        alt="Profile Picture"
      />
      <h1 className="p-5">{session.user.email}</h1>
      <Link href="/dashboard" className="p-5 hover:text-gwgreen">Dashboard</Link>
      <SignOut />
    </div>
  );
}
