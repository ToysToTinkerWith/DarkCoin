import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@txnlab/use-wallet-react";
import MarketCatalog from "../../components/contracts/Market/MarketCatalog";
import { stallPath } from "../../functions/market/model";

export default function Stall() {
  const router = useRouter();
  const { activeAddress } = useWallet();
  useEffect(() => {
    if (activeAddress) router.replace(stallPath(activeAddress));
  }, [activeAddress, router]);
  return <MarketCatalog ownStall />;
}
