import SelectButton from "../button/SelectButton";

type FilterType = "all" | "favorites";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "favorites", label: "Favorites" },
];

type FilterTabsProps = {
  readonly selectedFilter: FilterType;
  readonly isDark: boolean;
  readonly setSelectedFilter: (key: FilterType) => void;
};

export default function FilterTabs({
  selectedFilter,
  isDark,
  setSelectedFilter,
}: FilterTabsProps) {
  return (
    <SelectButton
      isDark={isDark}
      buttonData={FILTERS}
      selectedFilter={selectedFilter}
      onPress={setSelectedFilter}
    />
  );
}