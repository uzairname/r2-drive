import { Shell } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">R2 Drive</h1>
        <p className="text-muted-foreground">
          A file explorer for Cloudflare R2 storage.
        </p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>Explore and manage your R2 files.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Browse, upload, download, and delete files from your R2 storage.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Buckets</CardTitle>
              <CardDescription>Manage your R2 buckets.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>View bucket details and manage bucket settings.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure your R2 Drive settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Customize your R2 Drive experience.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
