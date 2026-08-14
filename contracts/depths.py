from pyteal import *
from pathlib import Path


REWARDS_BOX = Bytes("rewards")
UINT64_BYTES = Int(8)
REWARD_ENTRY_BYTES = Int(16)
ONE_REWARD_UNIT = Int(1)


@Subroutine(TealType.bytes)
def reward_entry(amount, asset_id):
    return Concat(Itob(amount), Itob(asset_id))


@Subroutine(TealType.uint64)
def entry_amount(entries, offset):
    return Btoi(Substring(entries, offset, offset + UINT64_BYTES))


@Subroutine(TealType.uint64)
def entry_asset_id(entries, offset):
    return Btoi(Substring(entries, offset + UINT64_BYTES, offset + REWARD_ENTRY_BYTES))


def approval_program():
    handle_creation = Return(Int(1))
    handle_optin = Return(Int(1))
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Txn.sender() == Global.creator_address())
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    opt_in_asset = Seq(
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.assets.length() >= Int(1)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        Int(1),
    )

    load_offset = ScratchVar(TealType.uint64)
    load_found = ScratchVar(TealType.uint64)
    load_amount = ScratchVar(TealType.uint64)
    rewards = App.box_get(REWARDS_BOX)

    load_reward = Seq(
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.assets.length() >= Int(1)),
        Assert(Txn.group_index() > Int(0)),
        Assert(Gtxn[Txn.group_index() - Int(1)].type_enum() == TxnType.AssetTransfer),
        Assert(Gtxn[Txn.group_index() - Int(1)].xfer_asset() == Txn.assets[0]),
        Assert(Gtxn[Txn.group_index() - Int(1)].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[Txn.group_index() - Int(1)].asset_amount() > Int(0)),
        load_amount.store(Gtxn[Txn.group_index() - Int(1)].asset_amount()),
        rewards,
        If(
            Not(rewards.hasValue()),
            App.box_put(REWARDS_BOX, reward_entry(load_amount.load(), Txn.assets[0])),
            Seq(
                Assert(Len(rewards.value()) % REWARD_ENTRY_BYTES == Int(0)),
                load_offset.store(Int(0)),
                load_found.store(Int(0)),
                While(load_offset.load() < Len(rewards.value())).Do(
                    Seq(
                        If(
                            entry_asset_id(rewards.value(), load_offset.load()) == Txn.assets[0],
                            Seq(
                                App.box_replace(
                                    REWARDS_BOX,
                                    load_offset.load(),
                                    Itob(entry_amount(rewards.value(), load_offset.load()) + load_amount.load()),
                                ),
                                load_found.store(Int(1)),
                                load_offset.store(Len(rewards.value())),
                            ),
                            load_offset.store(load_offset.load() + REWARD_ENTRY_BYTES),
                        ),
                    )
                ),
                If(
                    load_found.load() == Int(0),
                    App.box_put(
                        REWARDS_BOX,
                        Concat(rewards.value(), reward_entry(load_amount.load(), Txn.assets[0])),
                    ),
                ),
            ),
        ),
        Int(1),
    )

    reward_box = App.box_get(REWARDS_BOX)
    reward_account = Txn.accounts[1]
    wallet_box = App.box_get(reward_account)
    reward_offset = ScratchVar(TealType.uint64)
    reward_total = ScratchVar(TealType.uint64)
    random_ticket = ScratchVar(TealType.uint64)
    selected_offset = ScratchVar(TealType.uint64)
    selected_amount = ScratchVar(TealType.uint64)
    selected_asset = ScratchVar(TealType.uint64)
    updated_rewards = ScratchVar(TealType.bytes)
    seed = ScratchVar(TealType.bytes)

    reward_wallet = Seq(
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.accounts.length() >= Int(1)),
        reward_box,
        Assert(reward_box.hasValue()),
        Assert(Len(reward_box.value()) >= REWARD_ENTRY_BYTES),
        Assert(Len(reward_box.value()) % REWARD_ENTRY_BYTES == Int(0)),
        reward_offset.store(Int(0)),
        reward_total.store(Int(0)),
        While(reward_offset.load() < Len(reward_box.value())).Do(
            Seq(
                Assert(entry_amount(reward_box.value(), reward_offset.load()) > Int(0)),
                reward_total.store(reward_total.load() + Int(1)),
                reward_offset.store(reward_offset.load() + REWARD_ENTRY_BYTES),
            )
        ),
        Assert(reward_total.load() > Int(0)),
        seed.store(
            Sha512_256(
                Concat(
                    Txn.sender(),
                    reward_account,
                    Itob(Global.round()),
                    Itob(Global.latest_timestamp()),
                    reward_box.value(),
                )
            )
        ),
        random_ticket.store(Btoi(Substring(seed.load(), Int(0), UINT64_BYTES)) % reward_total.load()),
        selected_offset.store(random_ticket.load() * REWARD_ENTRY_BYTES),
        selected_amount.store(entry_amount(reward_box.value(), selected_offset.load())),
        selected_asset.store(entry_asset_id(reward_box.value(), selected_offset.load())),
        If(
            selected_amount.load() == ONE_REWARD_UNIT,
            Seq(
                updated_rewards.store(
                    Concat(
                        Substring(reward_box.value(), Int(0), selected_offset.load()),
                        Substring(
                            reward_box.value(),
                            selected_offset.load() + REWARD_ENTRY_BYTES,
                            Len(reward_box.value()),
                        ),
                    )
                ),
                If(
                    Len(updated_rewards.load()) == Int(0),
                    Assert(App.box_delete(REWARDS_BOX)),
                    App.box_put(REWARDS_BOX, updated_rewards.load()),
                ),
            ),
            App.box_replace(
                REWARDS_BOX,
                selected_offset.load(),
                Itob(selected_amount.load() - ONE_REWARD_UNIT),
            ),
        ),
        wallet_box,
        If(
            wallet_box.hasValue(),
            Seq(
                Assert(Len(wallet_box.value()) == REWARD_ENTRY_BYTES),
                Assert(entry_asset_id(wallet_box.value(), Int(0)) == selected_asset.load()),
                App.box_put(
                    reward_account,
                    reward_entry(entry_amount(wallet_box.value(), Int(0)) + ONE_REWARD_UNIT, selected_asset.load()),
                ),
            ),
            App.box_put(reward_account, reward_entry(ONE_REWARD_UNIT, selected_asset.load())),
        ),
        Int(1),
    )

    dark_coin_amount = ScratchVar(TealType.uint64)
    dark_coin_reward_account = Txn.accounts[1]
    dark_coin_wallet_box = App.box_get(dark_coin_reward_account)

    grant_dark_coin = Seq(
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.application_args.length() >= Int(2)),
        Assert(Txn.accounts.length() >= Int(1)),
        Assert(Txn.assets.length() >= Int(1)),
        dark_coin_amount.store(Btoi(Txn.application_args[1])),
        Assert(dark_coin_amount.load() > Int(0)),
        dark_coin_wallet_box,
        If(
            dark_coin_wallet_box.hasValue(),
            Seq(
                Assert(Len(dark_coin_wallet_box.value()) == REWARD_ENTRY_BYTES),
                Assert(entry_asset_id(dark_coin_wallet_box.value(), Int(0)) == Txn.assets[0]),
                App.box_put(
                    dark_coin_reward_account,
                    reward_entry(
                        entry_amount(dark_coin_wallet_box.value(), Int(0)) + dark_coin_amount.load(),
                        Txn.assets[0],
                    ),
                ),
            ),
            App.box_put(dark_coin_reward_account, reward_entry(dark_coin_amount.load(), Txn.assets[0])),
        ),
        Int(1),
    )

    claim_box = App.box_get(Txn.sender())
    claim_amount = ScratchVar(TealType.uint64)
    claim_asset = ScratchVar(TealType.uint64)

    claim_reward = Seq(
        Assert(Txn.application_args.length() >= Int(1)),
        Assert(Txn.assets.length() >= Int(1)),
        claim_box,
        Assert(claim_box.hasValue()),
        Assert(Len(claim_box.value()) == REWARD_ENTRY_BYTES),
        claim_amount.store(entry_amount(claim_box.value(), Int(0))),
        claim_asset.store(entry_asset_id(claim_box.value(), Int(0))),
        Assert(claim_amount.load() > Int(0)),
        Assert(claim_asset.load() == Txn.assets[0]),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: claim_asset.load(),
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: claim_amount.load(),
        }),
        InnerTxnBuilder.Submit(),
        Assert(App.box_delete(Txn.sender())),
        Int(1),
    )

    return Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in_asset)],
        [Txn.application_args[0] == Bytes("loadReward"), Return(load_reward)],
        [Txn.application_args[0] == Bytes("rewardWallet"), Return(reward_wallet)],
        [Txn.application_args[0] == Bytes("grantDarkCoin"), Return(grant_dark_coin)],
        [Txn.application_args[0] == Bytes("claimReward"), Return(claim_reward)],
    )


def clear_state_program():
    return Return(Int(1))


if __name__ == "__main__":
    output_dir = Path(__file__).resolve().parent

    with open(output_dir / "vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
        f.write(compiled)

    with open(output_dir / "vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
        f.write(compiled)
