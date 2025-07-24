export function toHookName<Name extends string>(name: Name): ToHookName<Name> {
  const n = name.charAt(0).toUpperCase();
  const ame = name.substring(1);

  return `use${n}${ame}` as ToHookName<Name>;
}

export function toInstanceName<Name extends string>(
  name: Name,
): ToInstanceName<Name> {
  const n = name.charAt(0).toLocaleLowerCase();
  const ame = name.substring(1);

  return `${n}${ame}` as ToInstanceName<Name>;
}

export type ToHookName<Name extends string> = `use${Capitalize<Name>}`;

export type ToInstanceName<Name extends string> = Uncapitalize<Name>;
