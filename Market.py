from pyteal import *


def approval_program():

    _ascii_zero = 48
    _ascii_nine = _ascii_zero + 9
    ascii_zero = Int(_ascii_zero)
    ascii_nine = Int(_ascii_nine)

    @Subroutine(TealType.uint64)
    def ascii_to_int(arg):
        """ascii_to_int converts the integer representing a character in ascii to the actual integer it represents
        Args:
            arg: uint64 in the range 48-57 that is to be converted to an integer
        Returns:
            uint64 that is the value the ascii character passed in represents
        """
        return Seq(Assert(arg >= ascii_zero), Assert(arg <= ascii_nine), arg - ascii_zero)

    @Subroutine(TealType.uint64)
    def pow10(x) -> Expr:
        """
        Returns 10^x, useful for things like total supply of an asset
        """
        return Exp(Int(10), x)

    @Subroutine(TealType.uint64)
    def atoi(a):
        """atoi converts a byte string representing a number to the integer value it represents"""
        return If(
            Len(a) > Int(0),
            (ascii_to_int(GetByte(a, Int(0))) * pow10(Len(a) - Int(1)))
            + atoi(Substring(a, Int(1), Len(a))),
            Int(0),
        )
    
    handle_creation = Return(
        Seq(
            App.globalPut(Bytes("Address"), Global.current_application_address()),
            Int(1)
        )
    )
    
    hoomens = Seq(
        nftName := AssetParam.name(Txn.assets[0]),
        Assert(Substring(nftName.value(), Int(0), Int(13)) == Bytes("Happy Hoomens")),
        If(Txn.application_args[1] == Bytes("DC"),
           Seq(
                Assert(Gtxn[0].xfer_asset() == Int(1088771340)),
                Assert(Gtxn[0].asset_receiver() == Addr("II6ZZJFPVGXVGQOMDSZ3AXZEMX3UFRTXKBCQT7L25P3ON2SWJUFXOCRW2A")),
                Assert(Gtxn[0].asset_amount() == Int(166250000000)),
                Assert(Gtxn[1].xfer_asset() == Int(1088771340)),
                Assert(Gtxn[1].asset_receiver() == Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")),
                Assert(Gtxn[1].asset_amount() == Int(8750000000))
           )
        ),
        If(Txn.application_args[1] == Bytes("TRTS"),
           Seq(
                Assert(Gtxn[0].xfer_asset() == Int(1000870705)),
                Assert(Gtxn[0].asset_receiver() == Addr("II6ZZJFPVGXVGQOMDSZ3AXZEMX3UFRTXKBCQT7L25P3ON2SWJUFXOCRW2A")),
                Assert(Gtxn[0].asset_amount() == Int(114000)),
                Assert(Gtxn[1].xfer_asset() == Int(1000870705)),
                Assert(Gtxn[1].asset_receiver() == Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")),
                Assert(Gtxn[1].asset_amount() == Int(6000))
           )
        ),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Int(1),
        }),
        InnerTxnBuilder.Submit(),
       Int(1)

        
        
    )

    opt_in = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )

    sell = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        Assert(Gtxn[0].asset_receiver() == Global.current_application_address()),
        App.box_put(Txn.application_args[1], Txn.application_args[2]),
        Int(1)
    )

    buy = Seq(
        Assert(Gtxn[0].xfer_asset() == Int(1088771340)),
        Assert(Gtxn[0].asset_receiver() == Txn.accounts[1]),
        Assert(Gtxn[0].asset_amount() == Mul(atoi(Txn.application_args[2]), Int(1000000))),
        boxVal := App.box_get(Concat(Txn.application_args[1], Bytes(">"), Txn.application_args[2])),
        Assert(Txn.application_args[3] == boxVal.value()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Int(1),
        }),
        InnerTxnBuilder.Submit(),
        Assert(App.box_delete(Concat(Txn.application_args[1], Bytes(">"), Txn.application_args[2]))),
        Int(1)

    )

    opt = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )

    # doesn't need anyone to opt in
    handle_optin = Return(Int(1))

    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())


    # handle the types of application calls
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("Hoomens"), Return(hoomens)],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)],
        [Txn.application_args[0] == Bytes("opt"), Return(opt)],
        [Txn.application_args[0] == Bytes("sell"), Return(sell)],
        [Txn.application_args[0] == Bytes("buy"), Return(buy)]

    )
    
    return program

# let clear state happen
def clear_state_program():
    program = Return(Int(1))
    return program
    


if __name__ == "__main__":
    with open("vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
        f.write(compiled)

    with open("vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
        f.write(compiled)