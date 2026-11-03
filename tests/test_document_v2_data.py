import pytest
from bench.document_v2_data import template_id, split_templates, field_box, bounded_records


def test_source_template_split_keeps_variants_together():
    assert template_id("alb_id_00.jpg") == "alb_id"
    assert template_id("rus_internalpassport_99.jpg") == "rus_internalpassport"
    with pytest.raises(ValueError):
        template_id("unmapped.jpg")
    split = split_templates(["a","b","c","d","e","f","g","h","i","j"])
    assert set(split.values()) == {"train","dev","test"}
    assert split == split_templates(reversed(list(split)))


def test_region_comes_from_unique_annotated_field_and_rejects_invalid_coordinates():
    shape = dict(name="rect",x=10,y=20,width=30,height=40)
    row = dict(filename="00.jpg",regions=[dict(shape_attributes=shape,region_attributes=dict(field_name="expiry_date"))])
    ann = {"_via_img_metadata":{"arbitrary-key":row}}
    assert field_box(ann,"alb_id_00.jpg","expiry_date") == [10,20,40,60]
    with pytest.raises(ValueError):
        field_box(ann,"alb_id_00.jpg","unknown")
    shape["width"] = float("nan")
    with pytest.raises(ValueError):
        field_box(ann,"alb_id_00.jpg","expiry_date")


def test_bounding_retains_entire_source_group_instead_of_splitting_pairs():
    rows = [dict(id=f"{s}-{i}",source=s,split="train",label=i%2) for s in ["a","b","c"] for i in range(4)]
    subset = bounded_records(rows,{"train":1})
    assert len(subset) == 4
    selected = {r["source"] for r in subset}
    assert len(selected)==1
    assert {r["id"] for r in subset} == {r["id"] for r in rows if r["source"] in selected}
