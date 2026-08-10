import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table, type Column } from "./Table";

interface Row {
  id: string;
  name: string;
}

const columns: Column<Row>[] = [{ key: "name", header: "Name", render: (r) => r.name }];

describe("Table", () => {
  it("renders the empty-state message when there are no rows", () => {
    render(<Table columns={columns} rows={[]} rowKey={(r) => r.id} emptyMessage="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders one row per item using the provided column renderer", () => {
    const rows: Row[] = [{ id: "1", name: "Alpha" }, { id: "2", name: "Beta" }];
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 rows
  });
});
