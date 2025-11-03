
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function GovernmentRegisterPage() {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Government Authority Registration</CardTitle>
        <CardDescription>Information regarding account creation for Government bodies.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Registration by Admin</AlertTitle>
          <AlertDescription>
            Accounts for Government authorities must be created by a platform Administrator to ensure security and proper verification. Please contact the AgriChain administrator to have your account registered.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between pt-4">
            <Button variant="link" asChild>
                <Link href="/register">Back to roles</Link>
            </Button>
            <Button asChild>
                <Link href="/login">Go to Login</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
