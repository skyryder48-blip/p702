// Wikidata structured facts adapter
// Fetches structured biographical data (birth date, education, etc.)

export interface WikidataFacts {
  wikidataId: string;
  birthDate?: string;
  birthPlace?: string;
  education: string[];
  almaMater: string[];
  spouse?: string;
  children?: number;
  religion?: string;
  occupation: string[];
  website?: string;
}

export class WikidataAdapter {
  private sparqlEndpoint = 'https://query.wikidata.org/sparql';

  async getFactsByName(name: string): Promise<WikidataFacts | null> {
    // First, search for the entity
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json&origin=*`;

    try {
      const searchRes = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' },
      });
      const searchData = await searchRes.json();

      // Find the politician among results
      const entity = searchData.search?.find(
        (s: any) => s.description?.toLowerCase().includes('politician') ||
                     s.description?.toLowerCase().includes('senator') ||
                     s.description?.toLowerCase().includes('representative') ||
                     s.description?.toLowerCase().includes('member of')
      ) ?? searchData.search?.[0];

      if (!entity) return null;

      return this.getFactsById(entity.id);
    } catch {
      return null;
    }
  }

  async getFactsById(wikidataId: string): Promise<WikidataFacts | null> {
    const query = `
      SELECT ?birthDate ?birthPlaceLabel ?spouseLabel ?religionLabel ?websiteUrl
             (GROUP_CONCAT(DISTINCT ?educationLabel; separator="|") AS ?educations)
             (GROUP_CONCAT(DISTINCT ?almaMaterLabel; separator="|") AS ?almaMaters)
             (GROUP_CONCAT(DISTINCT ?occupationLabel; separator="|") AS ?occupations)
      WHERE {
        OPTIONAL { wd:${wikidataId} wdt:P569 ?birthDate. }
        OPTIONAL { wd:${wikidataId} wdt:P19 ?birthPlace. }
        OPTIONAL { wd:${wikidataId} wdt:P26 ?spouse. }
        OPTIONAL { wd:${wikidataId} wdt:P140 ?religion. }
        OPTIONAL { wd:${wikidataId} wdt:P856 ?websiteUrl. }
        OPTIONAL { wd:${wikidataId} wdt:P69 ?almaMater. ?almaMater rdfs:label ?almaMaterLabel. FILTER(LANG(?almaMaterLabel)="en") }
        OPTIONAL { wd:${wikidataId} wdt:P512 ?education. ?education rdfs:label ?educationLabel. FILTER(LANG(?educationLabel)="en") }
        OPTIONAL { wd:${wikidataId} wdt:P106 ?occupation. ?occupation rdfs:label ?occupationLabel. FILTER(LANG(?occupationLabel)="en") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?birthDate ?birthPlaceLabel ?spouseLabel ?religionLabel ?websiteUrl
      LIMIT 1
    `;

    try {
      const res = await fetch(`${this.sparqlEndpoint}?query=${encodeURIComponent(query)}`, {
        headers: { 'Accept': 'application/sparql-results+json' },
      });

      const data = await res.json();
      const result = data.results?.bindings?.[0];
      if (!result) return null;

      return {
        wikidataId,
        birthDate: result.birthDate?.value?.split('T')[0],
        birthPlace: result.birthPlaceLabel?.value,
        education: result.educations?.value?.split('|').filter(Boolean) ?? [],
        almaMater: result.almaMaters?.value?.split('|').filter(Boolean) ?? [],
        spouse: result.spouseLabel?.value,
        religion: result.religionLabel?.value,
        occupation: result.occupations?.value?.split('|').filter(Boolean) ?? [],
        website: result.websiteUrl?.value,
      };
    } catch {
      return null;
    }
  }
}
