/** Remove MITRE's "(Citation: Name)" markers and the space before them. */
export const stripCitations = (md) => md.replace(/\s*\(Citation: [^)]*\)/g, '')
