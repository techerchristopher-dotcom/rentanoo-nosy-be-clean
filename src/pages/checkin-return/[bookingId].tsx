import { useParams } from "react-router-dom";

import EtatDesLieuxRetourForm from "@/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm";

export default function CheckinReturnPage() {
  const params = useParams();
  const bookingId = params?.bookingId as string | undefined;

  return <EtatDesLieuxRetourForm bookingId={bookingId} />;
}

