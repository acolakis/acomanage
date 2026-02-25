"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Review {
  id: string;
  reviewNumber: string | null;
  reviewDate: string;
  attendees: string | null;
  approvedAt: string | null;
  company: { id: string; name: string };
  approvedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface ReviewListFilterProps {
  reviews: Review[];
}

export function ReviewListFilter({ reviews }: ReviewListFilterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (r.reviewNumber &&
          r.reviewNumber.toLowerCase().includes(searchLower)) ||
        r.company.name.toLowerCase().includes(searchLower) ||
        (r.createdBy &&
          `${r.createdBy.firstName} ${r.createdBy.lastName}`
            .toLowerCase()
            .includes(searchLower)) ||
        (r.approvedBy &&
          `${r.approvedBy.firstName} ${r.approvedBy.lastName}`
            .toLowerCase()
            .includes(searchLower));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && r.approvedAt !== null) ||
        (statusFilter === "open" && r.approvedAt === null);

      return matchesSearch && matchesStatus;
    });
  }, [reviews, search, statusFilter]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nr., Betrieb, Person suchen..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="approved">Genehmigt</SelectItem>
            <SelectItem value="open">Offen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((review) => (
            <Link
              key={review.id}
              href={`/managementbewertung/${review.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {review.reviewNumber || "Ohne Nr."}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {review.company.name}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={review.approvedAt ? "default" : "secondary"}
                    >
                      {review.approvedAt ? "Genehmigt" : "Offen"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      Datum:{" "}
                      {new Date(review.reviewDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    {review.approvedBy && (
                      <span>
                        Genehmigt von: {review.approvedBy.firstName}{" "}
                        {review.approvedBy.lastName}
                      </span>
                    )}
                    {review.createdBy && (
                      <span>
                        Erstellt von: {review.createdBy.firstName}{" "}
                        {review.createdBy.lastName}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Keine Bewertungen für diese Filter gefunden."
                  : "Noch keine Managementbewertungen vorhanden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
