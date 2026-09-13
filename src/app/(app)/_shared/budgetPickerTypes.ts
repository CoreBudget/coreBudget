export interface AccountOption {
  id: string;
  name: string;
  group: "cash" | "credit";
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface SectionOption {
  id: string;
  name: string;
  categories: CategoryOption[];
}

export interface PayeeOption {
  id: string;
  name: string;
}
