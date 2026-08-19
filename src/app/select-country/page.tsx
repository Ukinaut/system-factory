import { getCountries } from "@/actions/countries";
import SelectCountryClient from "./SelectCountryClient";

export const metadata = {
  title: "Seleccionar País - AITUE",
  description: "Seleccione la región o subdivisión del sistema",
};

export default async function SelectCountryPage() {
  const result = await getCountries();
  const countries = result.success ? result.countries : [];

  return <SelectCountryClient initialCountries={countries} />;
}
