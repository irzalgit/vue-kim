export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWeb(
  query: string
): Promise<SearchResult[]> {

  console.log("Search:", query);

  return [
    {
      title: "Hasil simulasi",
      url: "#",
      snippet: `Mencari: ${query}`,
    },
  ];
}
