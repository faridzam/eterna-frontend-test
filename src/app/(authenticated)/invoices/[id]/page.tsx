import { InvoiceDetailScreen } from "@/src/features/invoices/components/invoice-detail-screen";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetailScreen id={id} />;
}
