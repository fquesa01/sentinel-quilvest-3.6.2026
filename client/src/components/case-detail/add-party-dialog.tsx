import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { insertCasePartySchema } from "@shared/schema";

const addPartyFormSchema = insertCasePartySchema.omit({
  caseId: true,
  addedBy: true,
  legalHoldStatus: true,
  legalHoldIssuedAt: true,
  legalHoldAcknowledgedAt: true,
  dataSourcesCollected: true,
  interviewStatus: true,
  riskLevel: true,
}).extend({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

type AddPartyFormValues = z.infer<typeof addPartyFormSchema>;

interface AddPartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddPartyFormValues) => void;
  isPending?: boolean;
  prefilledData?: {
    name?: string;
    email?: string;
    company?: string;
  } | null;
}

export function AddPartyDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  prefilledData,
}: AddPartyDialogProps) {
  const form = useForm<AddPartyFormValues>({
    resolver: zodResolver(addPartyFormSchema),
    defaultValues: {
      name: "",
      roleType: "employee",
      caseRole: "witness",
      email: undefined,
      phone: undefined,
      department: undefined,
      company: undefined,
      title: undefined,
      notes: undefined,
    },
  });

  useEffect(() => {
    if (prefilledData && open) {
      form.reset({
        name: prefilledData.name || "",
        email: prefilledData.email || "",
        company: prefilledData.company || "",
        roleType: "employee",
        caseRole: "witness",
        phone: undefined,
        department: undefined,
        title: undefined,
        notes: undefined,
      });
    }
  }, [prefilledData, open, form]);

  const handleSubmit = (values: AddPartyFormValues) => {
    onSubmit(values);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-party">
        <DialogHeader>
          <DialogTitle>Add Party or Custodian</DialogTitle>
          <DialogDescription>
            Add a person or entity involved in this case. All fields except Name, Role Type, and Case Role are optional.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Smith"
                      {...field}
                      data-testid="input-party-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role-type">
                          <SelectValue placeholder="Select role type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="regulator">Regulator</SelectItem>
                        <SelectItem value="outside_counsel">Outside Counsel</SelectItem>
                        <SelectItem value="whistleblower">Whistleblower</SelectItem>
                        <SelectItem value="third_party">Third Party</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="caseRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Role *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-case-role">
                          <SelectValue placeholder="Select case role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="subject">Subject</SelectItem>
                        <SelectItem value="witness">Witness</SelectItem>
                        <SelectItem value="bystander">Bystander</SelectItem>
                        <SelectItem value="reporter">Reporter</SelectItem>
                        <SelectItem value="counsel">Counsel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.smith@example.com"
                        {...field}
                        data-testid="input-party-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        {...field}
                        data-testid="input-party-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Chief Financial Officer"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-party-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Finance"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-party-department"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Corp"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-party-company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional information about this party..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="input-party-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-party"
              >
                {isPending ? "Adding..." : "Add Party"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
