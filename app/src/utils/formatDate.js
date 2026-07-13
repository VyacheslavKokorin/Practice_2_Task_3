function formatDate(date) {
  if (!date) {
    return "";
  }

  const value = new Date(date);

  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false
  }).formatToParts(value);

  const getPart = (type) => {
    return parts.find(part => part.type === type).value;
  };

  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");
  const hour = Number(getPart("hour"));
  const minute = getPart("minute");

  return `${day} ${month} ${year} ${hour}:${minute}`;
}

module.exports = formatDate;