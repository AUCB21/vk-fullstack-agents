from pydantic import BaseModel, Field


class Item(BaseModel):
    item_code: str = Field(alias="ItemCode")
    item_name: str = Field(alias="ItemName")
    quantity_on_stock: float = Field(default=0, alias="QuantityOnStock")
    quantity_ordered: float = Field(default=0, alias="QuantityOrdered")
    item_group_code: int | None = Field(default=None, alias="ItemGroupCode")
    price_list: float | None = Field(default=None, alias="PriceList")
    manufacturer: int | None = Field(default=None, alias="Manufacturer")
    valid: str | None = Field(default=None, alias="Valid")

    model_config = {"populate_by_name": True}


class BusinessPartner(BaseModel):
    card_code: str = Field(alias="CardCode")
    card_name: str = Field(alias="CardName")
    card_type: str = Field(default="C", alias="CardType")  # C=Customer, S=Supplier, L=Lead
    phone1: str | None = Field(default=None, alias="Phone1")
    email_address: str | None = Field(default=None, alias="EmailAddress")
    federal_tax_id: str | None = Field(default=None, alias="FederalTaxID")
    valid: str | None = Field(default=None, alias="Valid")

    model_config = {"populate_by_name": True}


class ODataParams(BaseModel):
    """OData query parameters for SAP SL requests."""

    filter: str | None = None
    select: str | None = None
    top: int | None = None
    skip: int | None = None
    orderby: str | None = None

    def to_query_params(self) -> dict[str, str]:
        params: dict[str, str] = {}
        if self.filter:
            params["$filter"] = self.filter
        if self.select:
            params["$select"] = self.select
        if self.top is not None:
            params["$top"] = str(self.top)
        if self.skip is not None:
            params["$skip"] = str(self.skip)
        if self.orderby:
            params["$orderby"] = self.orderby
        return params
