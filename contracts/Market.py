from pyteal import *


SHUFFLE_DETAIL_LEN = 88
SHUFFLE_ITEM_SIZE = 24
LEGACY_SHUFFLE_ITEM_SIZE = 16
SHUFFLE_REMOVE_ITEM_SIZE = 24
SHUFFLE_TREE_LEAF_COUNT = 128
SHUFFLE_TREE_NODE_COUNT = 256
SHUFFLE_TREE_LEN = SHUFFLE_TREE_NODE_COUNT * 8
SHUFFLE_TREE_DEPTH = 7
MAX_SHUFFLE_ASSET_SLOTS = 100
MAX_SHUFFLE_ASSETS_PER_TXN = 8
CLAIM_SLOT_COUNT = 100
CLAIM_SLOT_SIZE = 16
CLAIM_BOX_LEN = CLAIM_SLOT_COUNT * CLAIM_SLOT_SIZE
ROLL_CLAIM_HEADER_LEN = 8
ROLL_CLAIM_BOX_LEN = ROLL_CLAIM_HEADER_LEN + CLAIM_BOX_LEN
SHUFFLE_CREATE_FUNDING = 1000000
SHUFFLE_UNIQUE_ASSET_FUNDING = 1000000
SHUFFLE_LEGACY_MIGRATION_FUNDING = 1000000
SHUFFLE_TREE_FUNDING = 850000
SHUFFLE_ACTIVE_OFFSET = 80
CLAIM_BOX_FUNDING = 660000


def approval_program():
    handle_creation = Return(Int(1))

    i = ScratchVar(TealType.uint64)
    total_amount = ScratchVar(TealType.uint64)
    item_offset = ScratchVar(TealType.uint64)
    transfer_index = ScratchVar(TealType.uint64)
    cost_id = ScratchVar(TealType.uint64)
    cost_amount = ScratchVar(TealType.uint64)
    remaining = ScratchVar(TealType.uint64)
    asset_count = ScratchVar(TealType.uint64)
    roll_index = ScratchVar(TealType.uint64)
    cumulative = ScratchVar(TealType.uint64)
    item_amount = ScratchVar(TealType.uint64)
    item_weight = ScratchVar(TealType.uint64)
    item_capacity = ScratchVar(TealType.uint64)
    unit_amount = ScratchVar(TealType.uint64)
    decimal_index = ScratchVar(TealType.uint64)
    slot_index = ScratchVar(TealType.uint64)
    matched_item = ScratchVar(TealType.uint64)
    matched_slot_index = ScratchVar(TealType.uint64)
    chosen_asset = ScratchVar(TealType.uint64)
    chosen_amount = ScratchVar(TealType.uint64)
    chosen_unit_amount = ScratchVar(TealType.uint64)
    chosen_offset = ScratchVar(TealType.uint64)
    slot_asset = ScratchVar(TealType.uint64)
    slot_amount = ScratchVar(TealType.uint64)
    wrote_claim = ScratchVar(TealType.uint64)
    claim_slot_index = ScratchVar(TealType.uint64)
    claim_amount = ScratchVar(TealType.uint64)
    any_claim_left = ScratchVar(TealType.uint64)
    new_asset_count = ScratchVar(TealType.uint64)
    asset_transfer_count = ScratchVar(TealType.uint64)
    previous_transfer_index = ScratchVar(TealType.uint64)
    remove_count = ScratchVar(TealType.uint64)
    item_size = ScratchVar(TealType.uint64)
    migration_funding = ScratchVar(TealType.uint64)
    tree_funding = ScratchVar(TealType.uint64)
    tree_node_index = ScratchVar(TealType.uint64)
    tree_node_amount = ScratchVar(TealType.uint64)
    tree_offset = ScratchVar(TealType.uint64)
    left_weight = ScratchVar(TealType.uint64)
    claim_count = ScratchVar(TealType.uint64)
    claim_write_index = ScratchVar(TealType.uint64)

    def shuffle_detail_key():
        return Concat(Bytes("S"), Txn.application_args[1])

    def shuffle_items_key():
        return Concat(Bytes("I"), Txn.application_args[1])

    def shuffle_tree_key():
        return Concat(Bytes("T"), Txn.application_args[1])

    def claim_key(receiver):
        return Concat(Bytes("C"), receiver)

    def roll_claim_key(receiver):
        return Concat(Bytes("P"), receiver)

    def assert_shuffle_cost_paid(payment_index, creator):
        return If(
            cost_id.load() == Int(0),
            Seq(
                Assert(Gtxn[payment_index].type_enum() == TxnType.Payment),
                Assert(Gtxn[payment_index].receiver() == creator),
                Assert(Gtxn[payment_index].amount() == cost_amount.load()),
            ),
            Seq(
                Assert(Gtxn[payment_index].type_enum() == TxnType.AssetTransfer),
                Assert(Gtxn[payment_index].xfer_asset() == cost_id.load()),
                Assert(Gtxn[payment_index].asset_receiver() == creator),
                Assert(Gtxn[payment_index].asset_amount() == cost_amount.load()),
            ),
        )

    def assert_shuffle_funding_paid(payment_index, amount):
        return Seq(
            Assert(Gtxn[payment_index].type_enum() == TxnType.Payment),
            Assert(Gtxn[payment_index].receiver() == Global.current_application_address()),
            Assert(Gtxn[payment_index].amount() >= amount),
        )

    def assert_prize_transfer_asset_is_unique(current_transfer_index):
        return For(
            slot_index.store(Int(0)),
            slot_index.load() < i.load(),
            slot_index.store(slot_index.load() + Int(1)),
        ).Do(
            Seq(
                previous_transfer_index.store(Add(Txn.group_index(), Add(slot_index.load(), Int(1)))),
                Assert(Gtxn[previous_transfer_index.load()].xfer_asset() != Gtxn[current_transfer_index].xfer_asset()),
            )
        )

    def opt_into_asset_if_needed(asset_id):
        balance = AssetHolding.balance(Global.current_application_address(), asset_id)

        return Seq(
            balance,
            If(
                Not(balance.hasValue()),
                Seq(
                    InnerTxnBuilder.Begin(),
                    InnerTxnBuilder.SetFields(
                        {
                            TxnField.type_enum: TxnType.AssetTransfer,
                            TxnField.xfer_asset: asset_id,
                            TxnField.asset_receiver: Global.current_application_address(),
                            TxnField.asset_amount: Int(0),
                            TxnField.fee: Int(0),
                        }
                    ),
                    InnerTxnBuilder.Submit(),
                ),
            ),
        )

    def store_display_unit_amount(asset_id):
        asset_decimals = AssetParam.decimals(asset_id)

        return Seq(
            asset_decimals,
            Assert(asset_decimals.hasValue()),
            unit_amount.store(Int(1)),
            For(
                decimal_index.store(Int(0)),
                decimal_index.load() < asset_decimals.value(),
                decimal_index.store(decimal_index.load() + Int(1)),
            ).Do(unit_amount.store(Mul(unit_amount.load(), Int(10)))),
        )

    def load_shuffle_item_box_shape(box_len):
        return Seq(
            Assert(
                Or(
                    Mod(box_len, Int(SHUFFLE_ITEM_SIZE)) == Int(0),
                    Mod(box_len, Int(LEGACY_SHUFFLE_ITEM_SIZE)) == Int(0),
                )
            ),
            If(
                Mod(box_len, Int(SHUFFLE_ITEM_SIZE)) == Int(0),
                item_size.store(Int(SHUFFLE_ITEM_SIZE)),
                item_size.store(Int(LEGACY_SHUFFLE_ITEM_SIZE)),
            ),
            item_capacity.store(Div(box_len, item_size.load())),
            Assert(asset_count.load() <= item_capacity.load()),
        )

    def migrate_legacy_shuffle_items_if_needed():
        return If(
            item_size.load() == Int(LEGACY_SHUFFLE_ITEM_SIZE),
            Seq(
                App.box_resize(shuffle_items_key(), Int(MAX_SHUFFLE_ASSET_SLOTS * SHUFFLE_ITEM_SIZE)),
                For(
                    slot_index.store(asset_count.load()),
                    slot_index.load() > Int(0),
                    slot_index.store(slot_index.load() - Int(1)),
                ).Do(
                    Seq(
                        item_offset.store(Mul(slot_index.load() - Int(1), Int(LEGACY_SHUFFLE_ITEM_SIZE))),
                        slot_asset.store(Btoi(App.box_extract(shuffle_items_key(), item_offset.load(), Int(8)))),
                        slot_amount.store(Btoi(App.box_extract(shuffle_items_key(), Add(item_offset.load(), Int(8)), Int(8)))),
                        Assert(slot_asset.load() > Int(0)),
                        store_display_unit_amount(slot_asset.load()),
                        item_offset.store(Mul(slot_index.load() - Int(1), Int(SHUFFLE_ITEM_SIZE))),
                        App.box_replace(
                            shuffle_items_key(),
                            item_offset.load(),
                            Concat(Itob(slot_asset.load()), Itob(slot_amount.load()), Itob(unit_amount.load())),
                        ),
                    )
                ),
                item_size.store(Int(SHUFFLE_ITEM_SIZE)),
                item_capacity.store(Int(MAX_SHUFFLE_ASSET_SLOTS)),
            ),
        )

    def increase_shuffle_tree(slot, amount):
        return Seq(
            Assert(slot < Int(MAX_SHUFFLE_ASSET_SLOTS)),
            For(
                tree_node_index.store(Add(slot, Int(SHUFFLE_TREE_LEAF_COUNT))),
                tree_node_index.load() > Int(0),
                tree_node_index.store(Div(tree_node_index.load(), Int(2))),
            ).Do(
                Seq(
                    tree_offset.store(Mul(tree_node_index.load(), Int(8))),
                    tree_node_amount.store(Btoi(App.box_extract(shuffle_tree_key(), tree_offset.load(), Int(8)))),
                    App.box_replace(
                        shuffle_tree_key(),
                        tree_offset.load(),
                        Itob(Add(tree_node_amount.load(), amount)),
                    ),
                )
            ),
        )

    def decrease_shuffle_tree(slot, amount):
        return Seq(
            Assert(slot < Int(MAX_SHUFFLE_ASSET_SLOTS)),
            For(
                tree_node_index.store(Add(slot, Int(SHUFFLE_TREE_LEAF_COUNT))),
                tree_node_index.load() > Int(0),
                tree_node_index.store(Div(tree_node_index.load(), Int(2))),
            ).Do(
                Seq(
                    tree_offset.store(Mul(tree_node_index.load(), Int(8))),
                    tree_node_amount.store(Btoi(App.box_extract(shuffle_tree_key(), tree_offset.load(), Int(8)))),
                    Assert(tree_node_amount.load() >= amount),
                    App.box_replace(
                        shuffle_tree_key(),
                        tree_offset.load(),
                        Itob(Minus(tree_node_amount.load(), amount)),
                    ),
                )
            ),
        )

    def select_shuffle_tree_slot(target_index):
        return Seq(
            cumulative.store(target_index),
            tree_node_index.store(Int(1)),
            For(i.store(Int(0)), i.load() < Int(SHUFFLE_TREE_DEPTH), i.store(i.load() + Int(1))).Do(
                Seq(
                    tree_offset.store(Mul(Mul(tree_node_index.load(), Int(2)), Int(8))),
                    left_weight.store(Btoi(App.box_extract(shuffle_tree_key(), tree_offset.load(), Int(8)))),
                    If(
                        cumulative.load() < left_weight.load(),
                        tree_node_index.store(Mul(tree_node_index.load(), Int(2))),
                        Seq(
                            cumulative.store(Minus(cumulative.load(), left_weight.load())),
                            tree_node_index.store(Add(Mul(tree_node_index.load(), Int(2)), Int(1))),
                        ),
                    ),
                )
            ),
            slot_index.store(Minus(tree_node_index.load(), Int(SHUFFLE_TREE_LEAF_COUNT))),
            Assert(slot_index.load() < asset_count.load()),
        )

    def create_shuffle_tree_from_items():
        return Seq(
            Assert(App.box_create(shuffle_tree_key(), Int(SHUFFLE_TREE_LEN))),
            For(
                slot_index.store(Int(0)),
                slot_index.load() < asset_count.load(),
                slot_index.store(slot_index.load() + Int(1)),
            ).Do(
                Seq(
                    item_offset.store(Mul(slot_index.load(), item_size.load())),
                    slot_asset.store(Btoi(App.box_extract(shuffle_items_key(), item_offset.load(), Int(8)))),
                    slot_amount.store(Btoi(App.box_extract(shuffle_items_key(), Add(item_offset.load(), Int(8)), Int(8)))),
                    If(
                        item_size.load() == Int(SHUFFLE_ITEM_SIZE),
                        chosen_unit_amount.store(Btoi(App.box_extract(shuffle_items_key(), Add(item_offset.load(), Int(16)), Int(8)))),
                        Seq(store_display_unit_amount(slot_asset.load()), chosen_unit_amount.store(unit_amount.load())),
                    ),
                    If(
                        And(slot_asset.load() > Int(0), slot_amount.load() > Int(0), chosen_unit_amount.load() > Int(0)),
                        Seq(
                            item_weight.store(Div(slot_amount.load(), chosen_unit_amount.load())),
                            If(item_weight.load() > Int(0), increase_shuffle_tree(slot_index.load(), item_weight.load())),
                        ),
                    ),
                )
            ),
        )

    def append_roll_pending_claim(receiver, asset_id, amount):
        key = roll_claim_key(receiver)
        claim_box = App.box_get(key)
        claim_box_len = App.box_length(key)

        return Seq(
            claim_box,
            claim_box_len,
            If(
                Not(claim_box.hasValue()),
                Seq(Assert(App.box_create(key, Int(ROLL_CLAIM_BOX_LEN))), claim_count.store(Int(0))),
                Seq(
                    Assert(claim_box_len.hasValue()),
                    Assert(claim_box_len.value() == Int(ROLL_CLAIM_BOX_LEN)),
                    claim_count.store(Btoi(App.box_extract(key, Int(0), Int(8)))),
                ),
            ),
            Assert(claim_count.load() < Int(CLAIM_SLOT_COUNT)),
            item_offset.store(Add(Int(ROLL_CLAIM_HEADER_LEN), Mul(claim_count.load(), Int(CLAIM_SLOT_SIZE)))),
            App.box_replace(key, item_offset.load(), Concat(Itob(asset_id), Itob(amount))),
            App.box_replace(key, Int(0), Itob(Add(claim_count.load(), Int(1)))),
        )

    def add_pending_claim(receiver, asset_id, amount):
        key = claim_key(receiver)
        claim_box = App.box_get(key)
        claim_box_len = App.box_length(key)

        return Seq(
            claim_box,
            claim_box_len,
            If(
                Not(claim_box.hasValue()),
                Seq(Assert(App.box_create(key, Int(CLAIM_BOX_LEN))), item_capacity.store(Int(CLAIM_SLOT_COUNT))),
                Seq(
                    Assert(claim_box_len.hasValue()),
                    Assert(Mod(claim_box_len.value(), Int(CLAIM_SLOT_SIZE)) == Int(0)),
                    item_capacity.store(Div(claim_box_len.value(), Int(CLAIM_SLOT_SIZE))),
                ),
            ),
            wrote_claim.store(Int(0)),
            For(
                claim_slot_index.store(Int(0)),
                And(claim_slot_index.load() < item_capacity.load(), wrote_claim.load() == Int(0)),
                claim_slot_index.store(claim_slot_index.load() + Int(1)),
            ).Do(
                Seq(
                    item_offset.store(Mul(claim_slot_index.load(), Int(CLAIM_SLOT_SIZE))),
                    slot_asset.store(Btoi(App.box_extract(key, item_offset.load(), Int(8)))),
                    slot_amount.store(Btoi(App.box_extract(key, Add(item_offset.load(), Int(8)), Int(8)))),
                    If(
                        slot_asset.load() == asset_id,
                        Seq(
                            App.box_replace(
                                key,
                                Add(item_offset.load(), Int(8)),
                                Itob(Add(slot_amount.load(), amount)),
                            ),
                            wrote_claim.store(Int(1)),
                        ),
                        If(
                            slot_asset.load() == Int(0),
                            Seq(
                                App.box_replace(key, item_offset.load(), Concat(Itob(asset_id), Itob(amount))),
                                wrote_claim.store(Int(1)),
                            ),
                        ),
                    ),
                )
            ),
            Assert(wrote_claim.load() == Int(1)),
        )

    listAsset = Seq(
        Assert(Gtxn[Minus(Txn.group_index(), Int(2))].receiver() == Global.current_application_address()),
        Assert(Gtxn[Minus(Txn.group_index(), Int(2))].amount() == Int(100000)),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[0]),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_receiver() == Global.current_application_address()),
        box := App.box_get(
            Concat(
                Itob(Txn.assets[0]),
                Itob(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount()),
                Txn.application_args[1],
                Txn.application_args[2],
                Txn.sender(),
            )
        ),
        Assert(Not(box.hasValue())),
        App.box_put(
            Concat(
                Itob(Txn.assets[0]),
                Itob(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount()),
                Txn.application_args[1],
                Txn.application_args[2],
                Txn.sender(),
            ),
            Txn.sender(),
        ),
        Int(1),
    )

    buyAsset = Seq(
        Assert(Btoi(Txn.application_args[3]) <= Btoi(Txn.application_args[1])),
        If(
            Txn.assets[1] == Int(0),
            Seq(
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].receiver() == Txn.accounts[1]),
                Assert(
                    Gtxn[Minus(Txn.group_index(), Int(1))].amount()
                    == Mul(Btoi(Txn.application_args[2]), Btoi(Txn.application_args[3]))
                ),
            ),
            Seq(
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[1]),
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_receiver() == Txn.accounts[1]),
                Assert(
                    Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount()
                    == Mul(Btoi(Txn.application_args[2]), Btoi(Txn.application_args[3]))
                ),
            ),
        ),
        box := App.box_get(
            Concat(
                Itob(Txn.assets[0]),
                Txn.application_args[1],
                Itob(Txn.assets[1]),
                Txn.application_args[2],
                Txn.accounts[1],
            )
        ),
        Assert(box.hasValue()),
        Assert(
            App.box_delete(
                Concat(
                    Itob(Txn.assets[0]),
                    Txn.application_args[1],
                    Itob(Txn.assets[1]),
                    Txn.application_args[2],
                    Txn.accounts[1],
                )
            )
        ),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Txn.sender(),
                TxnField.asset_amount: Btoi(Txn.application_args[3]),
            }
        ),
        InnerTxnBuilder.Submit(),
        If(
            Minus(Btoi(Txn.application_args[1]), Btoi(Txn.application_args[3])) > Int(0),
            App.box_put(
                Concat(
                    Itob(Txn.assets[0]),
                    Itob(Minus(Btoi(Txn.application_args[1]), Btoi(Txn.application_args[3]))),
                    Itob(Txn.assets[1]),
                    Txn.application_args[2],
                    Txn.accounts[1],
                ),
                Txn.accounts[1],
            ),
        ),
        Int(1),
    )

    removeListing = Seq(
        box := App.box_get(
            Concat(
                Itob(Txn.assets[0]),
                Txn.application_args[1],
                Txn.application_args[2],
                Txn.application_args[3],
                Txn.sender(),
            )
        ),
        Assert(box.hasValue()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Txn.sender(),
                TxnField.asset_amount: Btoi(Txn.application_args[1]),
            }
        ),
        InnerTxnBuilder.Submit(),
        Assert(
            App.box_delete(
                Concat(
                    Itob(Txn.assets[0]),
                    Txn.application_args[1],
                    Txn.application_args[2],
                    Txn.application_args[3],
                    Txn.sender(),
                )
            )
        ),
        Int(1),
    )

    createShuffle = Seq(
        Assert(Len(Txn.application_args[1]) == Int(8)),
        Assert(Len(Txn.application_args[2]) == Int(8)),
        Assert(Len(Txn.application_args[3]) == Int(8)),
        Assert(Txn.group_index() > Int(0)),
        Assert(Global.group_size() > Add(Txn.group_index(), Int(1))),
        asset_transfer_count.store(Minus(Global.group_size(), Add(Txn.group_index(), Int(1)))),
        Assert(asset_transfer_count.load() > Int(0)),
        Assert(asset_transfer_count.load() <= Int(MAX_SHUFFLE_ASSETS_PER_TXN)),
        assert_shuffle_funding_paid(
            Minus(Txn.group_index(), Int(1)),
            Add(
                Int(SHUFFLE_CREATE_FUNDING),
                Mul(Int(SHUFFLE_UNIQUE_ASSET_FUNDING), asset_transfer_count.load()),
            ),
        ),
        Assert(App.box_create(shuffle_detail_key(), Int(SHUFFLE_DETAIL_LEN))),
        Assert(App.box_create(shuffle_items_key(), Int(MAX_SHUFFLE_ASSET_SLOTS * SHUFFLE_ITEM_SIZE))),
        Assert(App.box_create(shuffle_tree_key(), Int(SHUFFLE_TREE_LEN))),
        total_amount.store(Int(0)),
        For(i.store(Int(0)), i.load() < asset_transfer_count.load(), i.store(i.load() + Int(1))).Do(
            Seq(
                transfer_index.store(Add(Txn.group_index(), Add(i.load(), Int(1)))),
                Assert(Gtxn[transfer_index.load()].type_enum() == TxnType.AssetTransfer),
                Assert(Gtxn[transfer_index.load()].asset_receiver() == Global.current_application_address()),
                Assert(Gtxn[transfer_index.load()].asset_amount() > Int(0)),
                assert_prize_transfer_asset_is_unique(transfer_index.load()),
                opt_into_asset_if_needed(Gtxn[transfer_index.load()].xfer_asset()),
                store_display_unit_amount(Gtxn[transfer_index.load()].xfer_asset()),
                Assert(Mod(Gtxn[transfer_index.load()].asset_amount(), unit_amount.load()) == Int(0)),
                item_weight.store(Div(Gtxn[transfer_index.load()].asset_amount(), unit_amount.load())),
                Assert(item_weight.load() > Int(0)),
                item_offset.store(Mul(i.load(), Int(SHUFFLE_ITEM_SIZE))),
                App.box_replace(
                    shuffle_items_key(),
                    item_offset.load(),
                    Concat(
                        Itob(Gtxn[transfer_index.load()].xfer_asset()),
                        Itob(Gtxn[transfer_index.load()].asset_amount()),
                        Itob(unit_amount.load()),
                    ),
                ),
                increase_shuffle_tree(i.load(), item_weight.load()),
                total_amount.store(Add(total_amount.load(), item_weight.load())),
            )
        ),
        App.box_put(
            shuffle_detail_key(),
            Concat(
                Txn.sender(),
                Txn.application_args[2],
                Txn.application_args[3],
                Itob(total_amount.load()),
                Itob(total_amount.load()),
                Itob(asset_transfer_count.load()),
                Itob(Global.round()),
                Itob(Int(0)),
            ),
        ),
        Int(1),
    )

    addShuffleAssets = Seq(
        Assert(Len(Txn.application_args[1]) == Int(8)),
        Assert(Global.group_size() > Add(Txn.group_index(), Int(1))),
        asset_transfer_count.store(Minus(Global.group_size(), Add(Txn.group_index(), Int(1)))),
        Assert(asset_transfer_count.load() > Int(0)),
        Assert(asset_transfer_count.load() <= Int(MAX_SHUFFLE_ASSETS_PER_TXN)),
        detail_box := App.box_get(shuffle_detail_key()),
        item_box := App.box_get(shuffle_items_key()),
        tree_box := App.box_get(shuffle_tree_key()),
        item_box_len := App.box_length(shuffle_items_key()),
        Assert(detail_box.hasValue()),
        Assert(item_box.hasValue()),
        tree_box,
        item_box_len,
        Assert(item_box_len.hasValue()),
        Assert(Txn.sender() == Extract(detail_box.value(), Int(0), Int(32))),
        total_amount.store(Btoi(Extract(detail_box.value(), Int(48), Int(8)))),
        remaining.store(Btoi(Extract(detail_box.value(), Int(56), Int(8)))),
        asset_count.store(Btoi(Extract(detail_box.value(), Int(64), Int(8)))),
        load_shuffle_item_box_shape(item_box_len.value()),
        migration_funding.store(Int(0)),
        tree_funding.store(Int(0)),
        If(
            item_size.load() == Int(LEGACY_SHUFFLE_ITEM_SIZE),
            migration_funding.store(Int(SHUFFLE_LEGACY_MIGRATION_FUNDING)),
        ),
        If(
            Not(tree_box.hasValue()),
            tree_funding.store(Int(SHUFFLE_TREE_FUNDING)),
        ),
        If(
            Or(migration_funding.load() > Int(0), tree_funding.load() > Int(0)),
            Seq(
                Assert(Txn.group_index() > Int(0)),
                assert_shuffle_funding_paid(
                    Minus(Txn.group_index(), Int(1)),
                    Add(migration_funding.load(), tree_funding.load()),
                ),
            ),
        ),
        migrate_legacy_shuffle_items_if_needed(),
        If(Not(tree_box.hasValue()), create_shuffle_tree_from_items()),
        new_asset_count.store(Int(0)),
        For(i.store(Int(0)), i.load() < asset_transfer_count.load(), i.store(i.load() + Int(1))).Do(
            Seq(
                transfer_index.store(Add(Txn.group_index(), Add(i.load(), Int(1)))),
                Assert(Gtxn[transfer_index.load()].type_enum() == TxnType.AssetTransfer),
                Assert(Gtxn[transfer_index.load()].asset_receiver() == Global.current_application_address()),
                Assert(Gtxn[transfer_index.load()].asset_amount() > Int(0)),
                assert_prize_transfer_asset_is_unique(transfer_index.load()),
                store_display_unit_amount(Gtxn[transfer_index.load()].xfer_asset()),
                Assert(Mod(Gtxn[transfer_index.load()].asset_amount(), unit_amount.load()) == Int(0)),
                item_weight.store(Div(Gtxn[transfer_index.load()].asset_amount(), unit_amount.load())),
                Assert(item_weight.load() > Int(0)),
                matched_item.store(Int(0)),
                matched_slot_index.store(Int(0)),
                For(slot_index.store(Int(0)), slot_index.load() < asset_count.load(), slot_index.store(slot_index.load() + Int(1))).Do(
                    Seq(
                        item_offset.store(Mul(slot_index.load(), item_size.load())),
                        slot_asset.store(Btoi(App.box_extract(shuffle_items_key(), item_offset.load(), Int(8)))),
                        If(
                            And(matched_item.load() == Int(0), slot_asset.load() == Gtxn[transfer_index.load()].xfer_asset()),
                            Seq(
                                slot_amount.store(
                                    Btoi(App.box_extract(shuffle_items_key(), Add(item_offset.load(), Int(8)), Int(8)))
                                ),
                                If(
                                    item_size.load() == Int(SHUFFLE_ITEM_SIZE),
                                    chosen_unit_amount.store(
                                        Btoi(App.box_extract(shuffle_items_key(), Add(item_offset.load(), Int(16)), Int(8)))
                                    ),
                                    chosen_unit_amount.store(unit_amount.load()),
                                ),
                                Assert(chosen_unit_amount.load() == unit_amount.load()),
                                App.box_replace(
                                    shuffle_items_key(),
                                    Add(item_offset.load(), Int(8)),
                                    Itob(Add(slot_amount.load(), Gtxn[transfer_index.load()].asset_amount())),
                                ),
                                matched_slot_index.store(slot_index.load()),
                                matched_item.store(Int(1)),
                            ),
                        ),
                    )
                ),
                If(
                    matched_item.load() == Int(0),
                    Seq(
                        Assert(asset_count.load() < item_capacity.load()),
                        new_asset_count.store(Add(new_asset_count.load(), Int(1))),
                        Assert(Txn.group_index() > Int(0)),
                        assert_shuffle_funding_paid(
                            Minus(Txn.group_index(), Int(1)),
                            Add(
                                Add(migration_funding.load(), tree_funding.load()),
                                Mul(Int(SHUFFLE_UNIQUE_ASSET_FUNDING), new_asset_count.load()),
                            ),
                        ),
                        opt_into_asset_if_needed(Gtxn[transfer_index.load()].xfer_asset()),
                        item_offset.store(Mul(asset_count.load(), item_size.load())),
                        If(
                            item_size.load() == Int(SHUFFLE_ITEM_SIZE),
                            App.box_replace(
                                shuffle_items_key(),
                                item_offset.load(),
                                Concat(
                                    Itob(Gtxn[transfer_index.load()].xfer_asset()),
                                    Itob(Gtxn[transfer_index.load()].asset_amount()),
                                    Itob(unit_amount.load()),
                                ),
                            ),
                            App.box_replace(
                                shuffle_items_key(),
                                item_offset.load(),
                                Concat(
                                    Itob(Gtxn[transfer_index.load()].xfer_asset()),
                                    Itob(Gtxn[transfer_index.load()].asset_amount()),
                                ),
                            ),
                        ),
                        matched_slot_index.store(asset_count.load()),
                        asset_count.store(Add(asset_count.load(), Int(1))),
                    ),
                ),
                increase_shuffle_tree(matched_slot_index.load(), item_weight.load()),
                total_amount.store(Add(total_amount.load(), item_weight.load())),
                remaining.store(Add(remaining.load(), item_weight.load())),
            )
        ),
        App.box_replace(shuffle_detail_key(), Int(48), Itob(total_amount.load())),
        App.box_replace(shuffle_detail_key(), Int(56), Itob(remaining.load())),
        App.box_replace(shuffle_detail_key(), Int(64), Itob(asset_count.load())),
        Int(1),
    )

    rollShuffle = Seq(
        Assert(Len(Txn.application_args[1]) == Int(8)),
        detail_box := App.box_get(shuffle_detail_key()),
        item_box := App.box_get(shuffle_items_key()),
        tree_box := App.box_get(shuffle_tree_key()),
        roll_item_box_len := App.box_length(shuffle_items_key()),
        Assert(detail_box.hasValue()),
        Assert(item_box.hasValue()),
        Assert(tree_box.hasValue()),
        roll_item_box_len,
        Assert(roll_item_box_len.hasValue()),
        cost_id.store(Btoi(Extract(detail_box.value(), Int(32), Int(8)))),
        cost_amount.store(Btoi(Extract(detail_box.value(), Int(40), Int(8)))),
        remaining.store(Btoi(Extract(detail_box.value(), Int(56), Int(8)))),
        asset_count.store(Btoi(Extract(detail_box.value(), Int(64), Int(8)))),
        load_shuffle_item_box_shape(roll_item_box_len.value()),
        Assert(item_size.load() == Int(SHUFFLE_ITEM_SIZE)),
        Assert(Len(detail_box.value()) >= Int(SHUFFLE_DETAIL_LEN)),
        Assert(Btoi(Extract(detail_box.value(), Int(SHUFFLE_ACTIVE_OFFSET), Int(8))) == Int(1)),
        Assert(remaining.load() > Int(0)),
        pending_claim_box := App.box_get(roll_claim_key(Txn.sender())),
        pending_claim_box,
        If(
            cost_id.load() == Int(0),
            Seq(
                Assert(Txn.group_index() > Int(0)),
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].type_enum() == TxnType.Payment),
                If(
                    pending_claim_box.hasValue(),
                    Seq(
                        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].receiver() == Extract(detail_box.value(), Int(0), Int(32))),
                        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].amount() == cost_amount.load()),
                    ),
                    Seq(
                        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].receiver() == Global.current_application_address()),
                        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].amount() >= Add(cost_amount.load(), Int(CLAIM_BOX_FUNDING))),
                        Assert(Txn.accounts.length() > Int(0)),
                        Assert(Txn.accounts[1] == Extract(detail_box.value(), Int(0), Int(32))),
                        If(
                            cost_amount.load() > Int(0),
                            Seq(
                                InnerTxnBuilder.Begin(),
                                InnerTxnBuilder.SetFields(
                                    {
                                        TxnField.type_enum: TxnType.Payment,
                                        TxnField.receiver: Extract(detail_box.value(), Int(0), Int(32)),
                                        TxnField.amount: cost_amount.load(),
                                        TxnField.fee: Int(0),
                                    }
                                ),
                                InnerTxnBuilder.Submit(),
                            ),
                        ),
                    ),
                ),
            ),
            If(
                pending_claim_box.hasValue(),
                Seq(
                    Assert(Txn.group_index() > Int(0)),
                    assert_shuffle_cost_paid(Minus(Txn.group_index(), Int(1)), Extract(detail_box.value(), Int(0), Int(32))),
                ),
                Seq(
                    Assert(Txn.group_index() > Int(1)),
                    assert_shuffle_cost_paid(Minus(Txn.group_index(), Int(2)), Extract(detail_box.value(), Int(0), Int(32))),
                    Assert(Gtxn[Minus(Txn.group_index(), Int(1))].type_enum() == TxnType.Payment),
                    Assert(Gtxn[Minus(Txn.group_index(), Int(1))].receiver() == Global.current_application_address()),
                    Assert(Gtxn[Minus(Txn.group_index(), Int(1))].amount() >= Int(CLAIM_BOX_FUNDING)),
                ),
            ),
        ),
        roll_index.store(
            Mod(
                Btoi(
                    Extract(
                        Sha512_256(
                            Concat(
                                Itob(Global.round()),
                                Itob(Global.latest_timestamp()),
                                Txn.sender(),
                                Txn.application_args[1],
                                Itob(Txn.fee()),
                            )
                        ),
                        Int(0),
                        Int(8),
                    )
                ),
                remaining.load(),
            )
        ),
        tree_node_amount.store(Btoi(App.box_extract(shuffle_tree_key(), Int(8), Int(8)))),
        Assert(tree_node_amount.load() == remaining.load()),
        select_shuffle_tree_slot(roll_index.load()),
        chosen_offset.store(Mul(slot_index.load(), Int(SHUFFLE_ITEM_SIZE))),
        chosen_asset.store(Btoi(App.box_extract(shuffle_items_key(), chosen_offset.load(), Int(8)))),
        chosen_amount.store(Btoi(App.box_extract(shuffle_items_key(), Add(chosen_offset.load(), Int(8)), Int(8)))),
        chosen_unit_amount.store(Btoi(App.box_extract(shuffle_items_key(), Add(chosen_offset.load(), Int(16)), Int(8)))),
        Assert(chosen_asset.load() > Int(0)),
        Assert(chosen_amount.load() >= chosen_unit_amount.load()),
        App.box_replace(
            shuffle_items_key(),
            Add(chosen_offset.load(), Int(8)),
            Itob(Minus(chosen_amount.load(), chosen_unit_amount.load())),
        ),
        decrease_shuffle_tree(slot_index.load(), Int(1)),
        App.box_replace(shuffle_detail_key(), Int(56), Itob(Minus(remaining.load(), Int(1)))),
        append_roll_pending_claim(Txn.sender(), chosen_asset.load(), chosen_unit_amount.load()),
        If(
            remaining.load() == Int(1),
            Seq(
                Assert(App.box_delete(shuffle_detail_key())),
                Assert(App.box_delete(shuffle_items_key())),
                Assert(App.box_delete(shuffle_tree_key())),
            ),
        ),
        Int(1),
    )

    claimShuffleAsset = Seq(
        Assert(Txn.assets.length() > Int(0)),
        claim_box := App.box_get(claim_key(Txn.sender())),
        claim_box_len := App.box_length(claim_key(Txn.sender())),
        roll_claim_box := App.box_get(roll_claim_key(Txn.sender())),
        roll_claim_box_len := App.box_length(roll_claim_key(Txn.sender())),
        claim_box,
        claim_box_len,
        claim_amount.store(Int(0)),
        roll_claim_box,
        roll_claim_box_len,
        Assert(Or(claim_box.hasValue(), roll_claim_box.hasValue())),
        If(
            roll_claim_box.hasValue(),
            Seq(
                Assert(roll_claim_box_len.hasValue()),
                Assert(roll_claim_box_len.value() == Int(ROLL_CLAIM_BOX_LEN)),
                claim_count.store(Btoi(App.box_extract(roll_claim_key(Txn.sender()), Int(0), Int(8)))),
                Assert(claim_count.load() <= Int(CLAIM_SLOT_COUNT)),
                claim_write_index.store(Int(0)),
                For(i.store(Int(0)), i.load() < claim_count.load(), i.store(i.load() + Int(1))).Do(
                    Seq(
                        item_offset.store(Add(Int(ROLL_CLAIM_HEADER_LEN), Mul(i.load(), Int(CLAIM_SLOT_SIZE)))),
                        slot_asset.store(Btoi(App.box_extract(roll_claim_key(Txn.sender()), item_offset.load(), Int(8)))),
                        slot_amount.store(Btoi(App.box_extract(roll_claim_key(Txn.sender()), Add(item_offset.load(), Int(8)), Int(8)))),
                        If(
                            And(slot_asset.load() == Txn.assets[0], slot_amount.load() > Int(0)),
                            claim_amount.store(Add(claim_amount.load(), slot_amount.load())),
                            If(
                                And(slot_asset.load() > Int(0), slot_amount.load() > Int(0)),
                                Seq(
                                    chosen_offset.store(Add(Int(ROLL_CLAIM_HEADER_LEN), Mul(claim_write_index.load(), Int(CLAIM_SLOT_SIZE)))),
                                    If(
                                        Not(claim_write_index.load() == i.load()),
                                        App.box_replace(
                                            roll_claim_key(Txn.sender()),
                                            chosen_offset.load(),
                                            Concat(Itob(slot_asset.load()), Itob(slot_amount.load())),
                                        ),
                                    ),
                                    claim_write_index.store(Add(claim_write_index.load(), Int(1))),
                                ),
                            ),
                        ),
                    )
                ),
                For(i.store(claim_write_index.load()), i.load() < claim_count.load(), i.store(i.load() + Int(1))).Do(
                    Seq(
                        item_offset.store(Add(Int(ROLL_CLAIM_HEADER_LEN), Mul(i.load(), Int(CLAIM_SLOT_SIZE)))),
                        App.box_replace(roll_claim_key(Txn.sender()), item_offset.load(), Concat(Itob(Int(0)), Itob(Int(0)))),
                    )
                ),
                If(
                    claim_write_index.load() == Int(0),
                    Assert(App.box_delete(roll_claim_key(Txn.sender()))),
                    App.box_replace(roll_claim_key(Txn.sender()), Int(0), Itob(claim_write_index.load())),
                ),
            ),
        ),
        If(
            claim_box.hasValue(),
            Seq(
                Assert(claim_box_len.hasValue()),
                Assert(Mod(claim_box_len.value(), Int(CLAIM_SLOT_SIZE)) == Int(0)),
                item_capacity.store(Div(claim_box_len.value(), Int(CLAIM_SLOT_SIZE))),
                any_claim_left.store(Int(0)),
                For(i.store(Int(0)), i.load() < item_capacity.load(), i.store(i.load() + Int(1))).Do(
                    Seq(
                        item_offset.store(Mul(i.load(), Int(CLAIM_SLOT_SIZE))),
                        slot_asset.store(Btoi(App.box_extract(claim_key(Txn.sender()), item_offset.load(), Int(8)))),
                        slot_amount.store(Btoi(App.box_extract(claim_key(Txn.sender()), Add(item_offset.load(), Int(8)), Int(8)))),
                        If(
                            And(slot_asset.load() == Txn.assets[0], slot_amount.load() > Int(0)),
                            Seq(
                                claim_amount.store(Add(claim_amount.load(), slot_amount.load())),
                                App.box_replace(claim_key(Txn.sender()), item_offset.load(), Concat(Itob(Int(0)), Itob(Int(0)))),
                            ),
                            If(And(slot_asset.load() > Int(0), slot_amount.load() > Int(0)), any_claim_left.store(Int(1))),
                        ),
                    )
                ),
                If(any_claim_left.load() == Int(0), Assert(App.box_delete(claim_key(Txn.sender())))),
            ),
        ),
        Assert(claim_amount.load() > Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Txn.sender(),
                TxnField.asset_amount: claim_amount.load(),
                TxnField.fee: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        Int(1),
    )

    removeShuffleAssets = Seq(
        Assert(Len(Txn.application_args[1]) == Int(8)),
        Assert(Txn.application_args.length() == Int(3)),
        Assert(Len(Txn.application_args[2]) > Int(0)),
        Assert(Mod(Len(Txn.application_args[2]), Int(SHUFFLE_REMOVE_ITEM_SIZE)) == Int(0)),
        remove_count.store(Div(Len(Txn.application_args[2]), Int(SHUFFLE_REMOVE_ITEM_SIZE))),
        Assert(remove_count.load() <= Int(MAX_SHUFFLE_ASSETS_PER_TXN)),
        detail_box := App.box_get(shuffle_detail_key()),
        item_box := App.box_get(shuffle_items_key()),
        tree_box := App.box_get(shuffle_tree_key()),
        remove_item_box_len := App.box_length(shuffle_items_key()),
        Assert(detail_box.hasValue()),
        Assert(item_box.hasValue()),
        Assert(tree_box.hasValue()),
        remove_item_box_len,
        Assert(remove_item_box_len.hasValue()),
        Assert(Txn.sender() == Extract(detail_box.value(), Int(0), Int(32))),
        total_amount.store(Btoi(Extract(detail_box.value(), Int(48), Int(8)))),
        remaining.store(Btoi(Extract(detail_box.value(), Int(56), Int(8)))),
        asset_count.store(Btoi(Extract(detail_box.value(), Int(64), Int(8)))),
        load_shuffle_item_box_shape(remove_item_box_len.value()),
        For(i.store(Int(0)), i.load() < remove_count.load(), i.store(i.load() + Int(1))).Do(
            Seq(
                item_offset.store(Mul(i.load(), Int(SHUFFLE_REMOVE_ITEM_SIZE))),
                slot_index.store(Btoi(Extract(Txn.application_args[2], item_offset.load(), Int(8)))),
                chosen_asset.store(Btoi(Extract(Txn.application_args[2], Add(item_offset.load(), Int(8)), Int(8)))),
                chosen_amount.store(Btoi(Extract(Txn.application_args[2], Add(item_offset.load(), Int(16)), Int(8)))),
                Assert(slot_index.load() < asset_count.load()),
                Assert(chosen_asset.load() > Int(0)),
                Assert(chosen_amount.load() > Int(0)),
                item_offset.store(Mul(slot_index.load(), item_size.load())),
                slot_asset.store(Btoi(App.box_extract(shuffle_items_key(), item_offset.load(), Int(8)))),
                slot_amount.store(Btoi(App.box_extract(shuffle_items_key(), Add(item_offset.load(), Int(8)), Int(8)))),
                If(
                    item_size.load() == Int(SHUFFLE_ITEM_SIZE),
                    chosen_unit_amount.store(Btoi(App.box_extract(shuffle_items_key(), Add(item_offset.load(), Int(16)), Int(8)))),
                    Seq(store_display_unit_amount(chosen_asset.load()), chosen_unit_amount.store(unit_amount.load())),
                ),
                Assert(slot_asset.load() == chosen_asset.load()),
                Assert(slot_amount.load() >= chosen_amount.load()),
                Assert(chosen_unit_amount.load() > Int(0)),
                Assert(Mod(chosen_amount.load(), chosen_unit_amount.load()) == Int(0)),
                item_weight.store(Div(chosen_amount.load(), chosen_unit_amount.load())),
                Assert(item_weight.load() > Int(0)),
                Assert(total_amount.load() >= item_weight.load()),
                Assert(remaining.load() >= item_weight.load()),
                App.box_replace(
                    shuffle_items_key(),
                    Add(item_offset.load(), Int(8)),
                    Itob(Minus(slot_amount.load(), chosen_amount.load())),
                ),
                decrease_shuffle_tree(slot_index.load(), item_weight.load()),
                total_amount.store(Minus(total_amount.load(), item_weight.load())),
                remaining.store(Minus(remaining.load(), item_weight.load())),
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields(
                    {
                        TxnField.type_enum: TxnType.AssetTransfer,
                        TxnField.xfer_asset: chosen_asset.load(),
                        TxnField.asset_receiver: Txn.sender(),
                        TxnField.asset_amount: chosen_amount.load(),
                        TxnField.fee: Int(0),
                    }
                ),
                InnerTxnBuilder.Submit(),
            )
        ),
        If(
            remaining.load() == Int(0),
            Seq(
                Assert(App.box_delete(shuffle_detail_key())),
                Assert(App.box_delete(shuffle_items_key())),
                Assert(App.box_delete(shuffle_tree_key())),
            ),
            Seq(
                App.box_replace(shuffle_detail_key(), Int(48), Itob(total_amount.load())),
                App.box_replace(shuffle_detail_key(), Int(56), Itob(remaining.load())),
            ),
        ),
        Int(1),
    )

    upgradeShuffleRolls = Seq(
        Assert(Len(Txn.application_args[1]) == Int(8)),
        Assert(Txn.group_index() > Int(0)),
        detail_box := App.box_get(shuffle_detail_key()),
        item_box := App.box_get(shuffle_items_key()),
        tree_box := App.box_get(shuffle_tree_key()),
        upgrade_item_box_len := App.box_length(shuffle_items_key()),
        Assert(detail_box.hasValue()),
        Assert(item_box.hasValue()),
        Assert(Not(tree_box.hasValue())),
        upgrade_item_box_len,
        Assert(upgrade_item_box_len.hasValue()),
        Assert(Txn.sender() == Extract(detail_box.value(), Int(0), Int(32))),
        assert_shuffle_funding_paid(Minus(Txn.group_index(), Int(1)), Int(SHUFFLE_TREE_FUNDING)),
        remaining.store(Btoi(Extract(detail_box.value(), Int(56), Int(8)))),
        asset_count.store(Btoi(Extract(detail_box.value(), Int(64), Int(8)))),
        load_shuffle_item_box_shape(upgrade_item_box_len.value()),
        Assert(item_size.load() == Int(SHUFFLE_ITEM_SIZE)),
        create_shuffle_tree_from_items(),
        tree_node_amount.store(Btoi(App.box_extract(shuffle_tree_key(), Int(8), Int(8)))),
        Assert(tree_node_amount.load() == remaining.load()),
        Int(1),
    )

    activateShuffle = Seq(
        Assert(Len(Txn.application_args[1]) == Int(8)),
        detail_box := App.box_get(shuffle_detail_key()),
        tree_box := App.box_get(shuffle_tree_key()),
        Assert(detail_box.hasValue()),
        Assert(tree_box.hasValue()),
        Assert(Len(detail_box.value()) >= Int(SHUFFLE_DETAIL_LEN)),
        Assert(Txn.sender() == Extract(detail_box.value(), Int(0), Int(32))),
        App.box_replace(shuffle_detail_key(), Int(SHUFFLE_ACTIVE_OFFSET), Itob(Int(1))),
        Int(1),
    )

    deactivateShuffle = Seq(
        Assert(Len(Txn.application_args[1]) == Int(8)),
        detail_box := App.box_get(shuffle_detail_key()),
        Assert(detail_box.hasValue()),
        Assert(Len(detail_box.value()) >= Int(SHUFFLE_DETAIL_LEN)),
        Assert(Txn.sender() == Extract(detail_box.value(), Int(0), Int(32))),
        App.box_replace(shuffle_detail_key(), Int(SHUFFLE_ACTIVE_OFFSET), Itob(Int(0))),
        Int(1),
    )

    resourceReferences = Int(1)

    handle_optin = Return(Int(1))
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Txn.sender() == Global.creator_address())
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    optin = Seq(
        Assert(Gtxn[Add(Txn.group_index(), Int(1))].receiver() == Global.current_application_address()),
        Assert(Gtxn[Add(Txn.group_index(), Int(1))].amount() == Int(100000)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        Int(1),
    )

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(optin)],
        [Txn.application_args[0] == Bytes("listAsset"), Return(listAsset)],
        [Txn.application_args[0] == Bytes("buyAsset"), Return(buyAsset)],
        [Txn.application_args[0] == Bytes("removeListing"), Return(removeListing)],
        [Txn.application_args[0] == Bytes("createShuffle"), Return(createShuffle)],
        [Txn.application_args[0] == Bytes("addShuffleAssets"), Return(addShuffleAssets)],
        [Txn.application_args[0] == Bytes("rollShuffle"), Return(rollShuffle)],
        [Txn.application_args[0] == Bytes("claimShuffleAsset"), Return(claimShuffleAsset)],
        [Txn.application_args[0] == Bytes("removeShuffleAssets"), Return(removeShuffleAssets)],
        [Txn.application_args[0] == Bytes("upgradeShuffleRolls"), Return(upgradeShuffleRolls)],
        [Txn.application_args[0] == Bytes("activateShuffle"), Return(activateShuffle)],
        [Txn.application_args[0] == Bytes("deactivateShuffle"), Return(deactivateShuffle)],
        [Txn.application_args[0] == Bytes("resourceReferences"), Return(resourceReferences)],
    )

    return program


def clear_state_program():
    program = Return(Int(1))
    return program


if __name__ == "__main__":
    with open("vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=10)
        f.write(compiled)

    with open("vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=10)
        f.write(compiled)
