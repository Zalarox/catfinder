export type Cat = {
  name: string;
  age: number;
  breed: string;
  gender: "Male" | "Female";
  url: string;
  pfp: string;
};

export const parseAgeToYears = (ageText: string): number => {
  const yearsMatch = ageText.match(/(\d+)\s+Year/);
  const monthsMatch = ageText.match(/(\d+)\s+Month/);

  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 0;

  const totalYears = years + months / 12;
  return parseFloat(totalYears.toFixed(2)); // limit to 2 decimal places
};
