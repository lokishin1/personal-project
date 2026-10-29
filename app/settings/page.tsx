import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) redirect("/login?next=/settings");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", claims.sub)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">설정</h1>
      <Card>
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          <CardDescription>{claims.email}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>프로필을 불러오지 못했습니다</AlertTitle>
              <AlertDescription>잠시 후 새로고침해 주세요.</AlertDescription>
            </Alert>
          ) : (
            <ProfileForm displayName={profile?.display_name ?? ""} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
