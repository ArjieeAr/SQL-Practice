import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DisplayNameForm } from "@/components/profile/display-name-form";
import { RecentSubmissions } from "@/components/profile/recent-submissions";
import { SolvedCard } from "@/components/profile/solved-card";
import { StreakCard } from "@/components/profile/streak-card";
import { getProfilePageData } from "@/lib/data/profile";

export const metadata: Metadata = {
  title: "Your profile",
};

const monthYear = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

export default function ProfilePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      {/* Everything here is per-user, so it all streams in behind one boundary. */}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </section>
  );
}

async function ProfileContent() {
  const data = await getProfilePageData();
  if (!data) redirect("/login?next=/profile");

  return (
    <>
      <header className="flex flex-col gap-1">
        <DisplayNameForm name={data.displayName} fallback={data.email ?? "Your profile"} />
        <p className="text-muted text-sm">
          {data.displayName && data.email ? `${data.email} · ` : ""}
          Member since {monthYear.format(new Date(data.memberSince))}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <SolvedCard stats={data.stats} />
        <StreakCard current={data.stats.current_streak} longest={data.stats.longest_streak} />
      </div>

      <RecentSubmissions submissions={data.recent} />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <div className="bg-surface h-8 w-64 animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-surface h-56 animate-pulse rounded-lg" />
        <div className="bg-surface h-56 animate-pulse rounded-lg" />
      </div>
      <div className="bg-surface h-64 animate-pulse rounded-lg" />
    </div>
  );
}
