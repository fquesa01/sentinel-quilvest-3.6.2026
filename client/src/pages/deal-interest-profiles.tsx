import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DealInterestProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  industries: string[];
  geographies: string[];
  states: string[];
  dealTypes: string[];
  keywords: string[];
  excludedTerms: string[];
  minDealValue: string | null;
  maxDealValue: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  name: string;
  description: string;
  industries: string;
  geographies: string;
  states: string;
  dealTypes: string;
  keywords: string;
  excludedTerms: string;
  minDealValue: string;
  maxDealValue: string;
  priority: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  industries: "",
  geographies: "",
  states: "",
  dealTypes: "",
  keywords: "",
  excludedTerms: "",
  minDealValue: "",
  maxDealValue: "",
  priority: "3",
  isActive: true,
};

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function joinCsv(value: string[] | null | undefined): string {
  return (value ?? []).join(", ");
}

function profileToForm(profile: DealInterestProfile): FormState {
  return {
    name: profile.name,
    description: profile.description ?? "",
    industries: joinCsv(profile.industries),
    geographies: joinCsv(profile.geographies),
    states: joinCsv(profile.states),
    dealTypes: joinCsv(profile.dealTypes),
    keywords: joinCsv(profile.keywords),
    excludedTerms: joinCsv(profile.excludedTerms),
    minDealValue: profile.minDealValue ?? "",
    maxDealValue: profile.maxDealValue ?? "",
    priority: String(profile.priority),
    isActive: profile.isActive,
  };
}

function formToPayload(form: FormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    industries: splitCsv(form.industries),
    geographies: splitCsv(form.geographies),
    states: splitCsv(form.states).map((s) => s.toUpperCase()),
    dealTypes: splitCsv(form.dealTypes),
    keywords: splitCsv(form.keywords),
    excludedTerms: splitCsv(form.excludedTerms),
    minDealValue: form.minDealValue.trim() || null,
    maxDealValue: form.maxDealValue.trim() || null,
    priority: Number(form.priority) || 3,
    isActive: form.isActive,
  };
}

function ChipList({ items, max = 4 }: { items: string[] | null | undefined; max?: number }) {
  const arr = items ?? [];
  if (arr.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const shown = arr.slice(0, max);
  const overflow = arr.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <Badge key={item} variant="secondary" className="text-xs font-normal">
          {item}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-xs font-normal">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}

export default function DealInterestProfilesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const profilesQuery = useQuery<{ data: DealInterestProfile[] }>({
    queryKey: ["/api/deal-interest-profiles"],
  });

  const profiles = profilesQuery.data?.data ?? [];
  const deletingProfile = useMemo(
    () => profiles.find((p) => p.id === deleteId) ?? null,
    [profiles, deleteId],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof formToPayload>) => {
      const res = await apiRequest("POST", "/api/deal-interest-profiles", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-interest-profiles"] });
      toast({ title: "Profile created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Could not create profile", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: string; payload: ReturnType<typeof formToPayload> }) => {
      const res = await apiRequest("PATCH", `/api/deal-interest-profiles/${args.id}`, args.payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-interest-profiles"] });
      toast({ title: "Profile updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Could not update profile", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/deal-interest-profiles/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-interest-profiles"] });
      toast({ title: "Profile deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Could not delete profile", description: err.message, variant: "destructive" });
    },
  });

  // Inline toggle without opening the dialog — drives the snooze workflow.
  const toggleActiveMutation = useMutation({
    mutationFn: async (args: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/deal-interest-profiles/${args.id}`, {
        isActive: args.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-interest-profiles"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not toggle", description: err.message, variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(profile: DealInterestProfile) {
    setEditingId(profile.id);
    setForm(profileToForm(profile));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function submit() {
    const payload = formToPayload(form);
    if (!payload.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Target className="h-6 w-6" />
            Deal Interest Profiles
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Tell the system what kinds of deals and contacts you care about. Profiles power the daily news scan and the
            "related past deals" panel on every new intake.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-new-profile">
          <Plus className="mr-2 h-4 w-4" />
          New profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your profiles</CardTitle>
          <CardDescription>
            Active profiles are evaluated nightly and on every new deal intake. Snooze a profile by toggling it off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profilesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-profiles">
              No profiles yet. Create one to start surfacing matching deals and contacts.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industries</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>States</TableHead>
                  <TableHead className="text-right">Deal value</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id} data-testid={`row-profile-${profile.id}`}>
                    <TableCell className="font-medium">
                      <div>{profile.name}</div>
                      {profile.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{profile.description}</div>
                      )}
                    </TableCell>
                    <TableCell><ChipList items={profile.industries} /></TableCell>
                    <TableCell><ChipList items={profile.keywords} /></TableCell>
                    <TableCell><ChipList items={profile.states} max={6} /></TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap">
                      {profile.minDealValue || profile.maxDealValue ? (
                        <span>
                          {profile.minDealValue ? `$${Number(profile.minDealValue).toLocaleString()}` : "–"}
                          {" – "}
                          {profile.maxDealValue ? `$${Number(profile.maxDealValue).toLocaleString()}` : "–"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Any</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{profile.priority}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={profile.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: profile.id, isActive: checked })
                        }
                        data-testid={`switch-active-${profile.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(profile)}
                          data-testid={`button-edit-${profile.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(profile.id)}
                          data-testid={`button-delete-${profile.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit profile" : "New profile"}</DialogTitle>
            <DialogDescription>
              Comma-separated lists. Match is OR within a field, AND across fields.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="dip-name">Name</Label>
              <Input
                id="dip-name"
                placeholder="e.g., Roofing & HVAC, Northeast"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="input-name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dip-description">Description (optional)</Label>
              <Textarea
                id="dip-description"
                rows={2}
                placeholder="What this profile is for"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dip-industries">Industries</Label>
                <Input
                  id="dip-industries"
                  placeholder="HVAC, dental practices, commercial roofing"
                  value={form.industries}
                  onChange={(e) => setForm((f) => ({ ...f, industries: e.target.value }))}
                  data-testid="input-industries"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dip-deal-types">Deal types</Label>
                <Input
                  id="dip-deal-types"
                  placeholder="acquisition, co-invest, LP"
                  value={form.dealTypes}
                  onChange={(e) => setForm((f) => ({ ...f, dealTypes: e.target.value }))}
                  data-testid="input-deal-types"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dip-keywords">Keywords (positive match)</Label>
              <Input
                id="dip-keywords"
                placeholder="roofing, multifamily, midwest"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                data-testid="input-keywords"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dip-excluded">Excluded terms (negative match)</Label>
              <Input
                id="dip-excluded"
                placeholder="residential, single-family"
                value={form.excludedTerms}
                onChange={(e) => setForm((f) => ({ ...f, excludedTerms: e.target.value }))}
                data-testid="input-excluded"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dip-states">States (2-letter codes)</Label>
                <Input
                  id="dip-states"
                  placeholder="TX, FL, NY"
                  value={form.states}
                  onChange={(e) => setForm((f) => ({ ...f, states: e.target.value }))}
                  data-testid="input-states"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dip-geographies">Geographies (free-form)</Label>
                <Input
                  id="dip-geographies"
                  placeholder="Northeast, Miami-Dade"
                  value={form.geographies}
                  onChange={(e) => setForm((f) => ({ ...f, geographies: e.target.value }))}
                  data-testid="input-geographies"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dip-min">Min deal value ($)</Label>
                <Input
                  id="dip-min"
                  type="number"
                  min="0"
                  placeholder="1000000"
                  value={form.minDealValue}
                  onChange={(e) => setForm((f) => ({ ...f, minDealValue: e.target.value }))}
                  data-testid="input-min-value"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dip-max">Max deal value ($)</Label>
                <Input
                  id="dip-max"
                  type="number"
                  min="0"
                  placeholder="50000000"
                  value={form.maxDealValue}
                  onChange={(e) => setForm((f) => ({ ...f, maxDealValue: e.target.value }))}
                  data-testid="input-max-value"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dip-priority">Priority (1 high – 5 low)</Label>
                <Input
                  id="dip-priority"
                  type="number"
                  min="1"
                  max="5"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  data-testid="input-priority"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="dip-active" className="cursor-pointer">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive profiles are skipped by the daily scan.</p>
              </div>
              <Switch
                id="dip-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                data-testid="switch-form-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={submit} disabled={isSaving} data-testid="button-save">
              {isSaving ? "Saving…" : editingId ? "Save changes" : "Create profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProfile
                ? `"${deletingProfile.name}" will be removed permanently. To pause it instead, toggle Active off.`
                : "This profile will be removed permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-confirm-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
